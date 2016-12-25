module.exports = function(replace) {
  const user = SysConfig.userInfo;
  if( user.type !== 1 ) {
    replace({pathname: '/dashboard'});
    return false;
  } else return true;
}