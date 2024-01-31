const proxy1 = () => {

  // use httpbin for initial testing
  const endpoint = "https://httpbin.org"

  // make a simple proxy of UrlFetchApp
  // in this case the handler (2nd argument) does nothing
  const proxy = new Proxy(UrlFetchApp, {})

  // check it still works
  result = JSON.parse(proxy.fetch(endpoint + "/get").getContentText())
  console.log(result)
}

const proxy2 = () => {

  // use httpbin for initial testing
  const endpoint = "https://httpbin.org"

  // lets intercept calls to the fetch argument 
  const proxy = new Proxy(UrlFetchApp, {
    // every time fetch is accessed this will be called first
    get(target, prop, receiver) {
      if (prop === 'fetch') {
        console.log('fetch called')
      }
      // reflect.get will return allthe same args as was passed to the proxy
      return Reflect.get(target, prop, receiver)
    }
  })

  // check it still works
  result = JSON.parse(proxy.fetch(endpoint + "/get").getContentText())
  console.log(result)
}

const proxy3 = () => {

  // use httpbin for initial testing
  const endpoint = "https://httpbin.org"

  // now let's validate that any args passed to the proxy exist
  const proxy = new Proxy(UrlFetchApp, {
    // every time fetch is accessed this will be called first
    get(target, prop, receiver) {
      console.log('trying property', prop)
      if (!Reflect.has(target, prop)) {
        throw `attempt to access unknown fetchapp property '${prop}'`
      }
      // reflect.get will return allthe same args as was passed to the proxy
      return Reflect.get(target, prop, receiver)
    }
  })
  // check it still works
  let result = JSON.parse(proxy.fetch(endpoint + "/get").getContentText())
  console.log(result)

  // try an invalid key
  result = JSON.parse(proxy.nonsense(endpoint + "/get").getContentText())
  console.log(result)
}

const proxy4 = () => {

  // use httpbin for initial testing
  const endpoint = "https://httpbin.org"

  // now intercept a function call to fetch and add the endpoint automatically
  const proxy = new Proxy(UrlFetchApp, {

    // every time fetch is accessed this will be called first
    get(target, prop, receiver) {

      // check its a good call
      if (!Reflect.has(target, prop)) {
        throw `attempt to access unknown fetchapp property '${prop}'`
      }
      // if we get a fetch call, we'd like to send it back with the endpoint encapsulated
      // so that when it's applied, it will execute my version of the function
      if (prop === 'fetch') {
        return new Proxy(target[prop], {
          // this 
          apply(func, thisArg, args) {
            // pick off the url and fiddle with the arguments
            const url = args[0] || ''
            return func.apply(thisArg, [endpoint + url].concat(args.slice(1)))
          }
        })
      }

      // reflect.get will return allthe same args as was passed to the proxy
      return Reflect.get(target, prop, receiver)
    }
  })

  // check it still works this time we don't need the endpoint
  let result = JSON.parse(proxy.fetch("/get").getContentText())
  console.log(result)

  // make sure that additional arguments still work
  result = JSON.parse(proxy.fetch("/get", {
    method: "post",
    payload: { data: "post options" },
    contentType: "application/json",
    header: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken()
    }
  }).getContentText())

  console.log(result)

}

const proxy5 = () => {

  // use requestbin for post testing
  const endpoint = "https://httpbin.org"

  // now intercept a function call to fetch and add the endpoint automatically
  const proxy = new Proxy(UrlFetchApp, {

    // every time fetch is accessed this will be called first
    get(target, prop, receiver) {

      // check its a good call
      if (!Reflect.has(target, prop)) {
        throw `attempt to access unknown fetchapp property '${prop}'`
      }
      // if we get a fetch call, we'd like to send it back with the endpoint encapsulated
      // so that when it's applied, it will execute my version of the function
      if (prop === 'fetch') {
        return new Proxy(target[prop], {
          // this 
          apply(func, thisArg, args) {
            // pick off the url and fiddle with the arguments
            const url = args[0] || ''
            return func.apply(thisArg, [endpoint + url].concat(args.slice(1)))
          }
        })
      }

      // reflect.get will return allthe same args as was passed to the proxy
      return Reflect.get(target, prop, receiver)
    }
  })

  // check it still works this time we don't need the endpoint
  let result = JSON.parse(proxy.fetch("/get").getContentText())
  console.log(result)

  // make sure that additional arguments still work
  result = JSON.parse(proxy.fetch("/post", {
    method: "post",
    payload: JSON.stringify({ stuff: "testing options with proxy fetch" }),
    contentType: "application/json",
    header: {
      Authorization: "Bearer " + ScriptApp.getOAuthToken()
    }
  }).getContentText())

  console.log(result.data)

}

const proxy6 = () => {

  // use requestbin for post testing
  const endpoint = "https://httpbin.org"

  // now add caching
  const cacher = getCache({ expiry: 3, prefix: 'proxy-demo-' })

  const proxy = new Proxy(UrlFetchApp, {

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
            const options = args[1] || {}
            const shouldCache = (options.method || "get").toLowerCase() === 'get'
            const url = endpoint + (args[0] || '')
            const cacheEntry = shouldCache && cacher.get(url)
            if (cacheEntry) return cacheEntry
            // since we're oly dealing with json in this example. we'll parse the result while we're at it
            const response = func.apply(thisArg, [url].concat(args.slice(1)))
            const text = response.getContentText()
            const value = JSON.parse(text)
            if (shouldCache) cacher.put(url, value)
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

  // we're doing caching and parsing in the proxy now
  let result = proxy.fetch("/get")
  // this is the api result
  console.log(result)
  console.log(result.value)
  // this is the cache data if it came from cache 
  console.log(result.cacheData)

  // if we do it again we should get it from cache
  console.log ('from cache', proxy.fetch("/get").cacheData)

    // what happens if we wait a bit - it should not come from cache
  Utilities.sleep (5000)
  console.log ('not from cache', proxy.fetch("/get").cacheData)

  
}

const proxy7 = () => {

  // this one with caching and everything
  const proxy = getProxy ({endpoint: "https://httpbin.org", expiry: 3}) 

  // we're doing caching and parsing in the proxy now
  let result = proxy.fetch("/get")
  // this is the api result
  console.log(result)
  console.log(result.value)
  // this is the cache data if it came from cache 
  console.log(result.cacheData)

  // if we do it again we should get it from cache
  console.log ('from cache', proxy.fetch("/get").cacheData)

    // what happens if we wait a bit - it should not come from cache
  Utilities.sleep (5000)
  console.log ('not from cache', proxy.fetch("/get").cacheData)
  
}

const proxy8 = () => {

  // this one with caching and everything. should be able to support posting as well
  const proxy = getProxy ({endpoint: "https://httpbin.org"}) 

  // we're doing caching and parsing in the proxy now
  let result = proxy.fetch("/post", {
    method: "post"
  })

  // this is the api result
  console.log(result)
  console.log(result.value)
  // this is the cache data if it came from cache 
  console.log('nocaching on a post', result.cacheData)

  // we can turn off caching too
  const noCache = getProxy ({noCache: true, endpoint: "https://httpbin.org"}) 
  noCache.fetch ('/get')

  // normally this would be cached - but we've turned it off
  console.log('shoud be undefined', noCache.fetch("/get").cacheData)
  
}

const getProxy = ({ noCache = false, expiry = 100, prefix = 'demo', endpoint = "https://httpbin.org" }) => {

    // now add caching
  const cacher = !noCache && getCache({ expiry, prefix })

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
            const options = args[1] || {}
            const shouldCache = cacher && (options.method || "get").toLowerCase() === 'get'
            const url = endpoint + (args[0] || '')
            const cacheEntry = shouldCache && cacher.get(url)
            if (cacheEntry) return cacheEntry
            // since we're oly dealing with json in this example. we'll parse the result while we're at it
            const response = func.apply(thisArg, [url].concat(args.slice(1)))
            const text = response.getContentText()
            const value = JSON.parse(text)
            if (shouldCache) cacher.put(url, value)
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

const getCache = ({ expiry = 100, prefix = '' }) => {
  // inject caching into fetch
  // some handy functions
  const isNU = (value) => typeof value === typeof undefined || value == null
  const getKey = (key) => {
    if (isNU(key) || key === '') throw 'cache key not specified'
    return prefix + key
  }
  const getExpiry = (value) => isNU(value) ? expiry : value
  const constructCacheEntry = (key, value, expiry) => {
    const createdAt = new Date().getTime()
    expiry = getExpiry(expiry)
    const expiresAt = createdAt + expiry * 1000
    return {
      value,
      cacheData: {
        key: getKey(key),
        createdAt,
        expiresAt,
        expiry
      }
    }
  }



  // a cache proxy
  return new Proxy(CacheService.getUserCache(), {
    // every time fetch is accessed this will be called first
    get(target, prop, receiver) {

      // check its a good call
      if (!Reflect.has(target, prop)) {
        throw `attempt to access unknown cacher property '${prop}'`
      }
      // if we get a fetch call, we'd like to send it back with the endpoint encapsulated
      // so that when it's applied, it will execute my version of the function

      if (prop === 'get') {
        return new Proxy(target[prop], {
          apply(func, thisArg, args) {
            const key = getKey(args[0])
            const result = func.apply(thisArg, [key])
            return result ? JSON.parse(result) : null
          }
        })
      } else if (prop === 'put') {
        return new Proxy(target[prop], {
          apply(func, thisArg, args) {
            const cacheEntry = constructCacheEntry(...args)
            const { key, expiry } = cacheEntry.cacheData
            func.apply(thisArg, [key, JSON.stringify(cacheEntry), expiry])
            return cacheEntry
          }
        })
      } else if (prop === 'remove') {
        return new Proxy(target[prop], {
          apply(func, thisArg, args) {
            const key = getKey(args[0])
            return func.apply(thisArg, [key])
          }
        })
      }

      // reflect.get will return allthe same args as was passed to the proxy
      return Reflect.get(target, prop, receiver)
    }
  })
}


