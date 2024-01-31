const setKeys = () => {
  PropertiesService.getUserProperties().setProperty('fid-apikey', "...your api key")
}
const getKeys = () => {
  // this is scoped to the logged on user 
  console.log(PropertiesService.getUserProperties().getProperty('fid-apikey'))
}