

const queryTest = () => {

  const queries = {
    Film: `query Film ($id: ID!) {
      Film (id: $id) {
        id
        filmName
        synopsis
      }
    }
   `
  }

  const gqlProxy = getGqlProxy()

  const result = gqlProxy.fetch({
    query: queries.Film,
    variables: {
      id: 1018
    }
  })

  console.log(JSON.stringify(result.value.data))
}


const getGqlProxy = ({
  noCache = false,
  expiry = 100,
  prefix = 'gql',
  endpoint = "https://api.xliberation.com/v1"
}={}) => {

  // now add caching
  const cacher = !noCache && getCache({ expiry, prefix })
  const apiKey = PropertiesService.getUserProperties().getProperty('fid-apikey')

  const getHeaders = (headers = {}) => ({
    ...headers,
    'x-fid-apikey': apiKey
  })

  // make a digest from arbitrary set of objects
  const digest = (...args) => {
    return Utilities.base64Encode(
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.MD5,
        Utilities.newBlob(JSON.stringify({ a: Array.from(args) })).getBytes()
      ))
  }

  return new Proxy(UrlFetchApp, {

    // every time fetch is accessed this will be called first
    get(target, prop, receiver) {

      // check its a good call
      if (!Reflect.has(target, prop)) {
        throw `attempt to access unknown fetchapp property '${prop}'`
      }

      // a get will populate cache when its not found in cache
      if (prop === 'fetch') {
        return new Proxy(target[prop], {
          // this 
          apply(func, thisArg, args) {

            // calls to gql are always post
            // we'll cache queries but not mutations - im not implementing mutations for this demo
            // the key needs to be a digest of the query content, the apikey and the url
            /// args are {query, variables}
            if (!args[0]) throw `arg should be {query?, mutation?, variables}`
            const load = args[0]            
            const shouldCache = cacher && load.query
            const keys = digest({ endpoint, load })
            const cacheEntry = shouldCache && cacher.get(digest)
            if (cacheEntry) return cacheEntry

            const payload = JSON.stringify(load)
            const contentType = "application/json"
            const headers = getHeaders()
            const options = {
              headers,
              contentType,
              muteHttpExceptions: true,
              payload,
              method: "post"
            }
            // since we're oly dealing with json in this example. we'll parse the result while we're at it
            const response = func.apply(thisArg, [endpoint, options])
            const text = response.getContentText()
            const value = JSON.parse(text)
            if (shouldCache) cacher.put(digest, value)
            return {
              value,
              response
            }
          }
        })
      }

      // reflect.get will return allthe same args as was passed to the proxy
      return Reflect.get(target, prop, receiver)
    }
  })

}

