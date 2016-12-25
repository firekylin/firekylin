module.exports = function(replace = new Function) {
  const user = SysConfig.userInfo;
  if( user.type !== 1 ) {
    replace({pathname: '/dashboard'});
    return false;
  } else return true;
}