/**
 * this file will be loaded before server started
 * you can define global functions used in controllers, models, templates
 */

/**
 * use global.xxx to define global functions
 * 
 * global.fn1 = function(){
 *     
 * }
 */

import moment from 'moment';

global.formatDateTime = (dateTime, type) => {
  if(dateTime && think.isString(dateTime)){
    dateTime = new Date(dateTime);
  }
  dateTime = dateTime || new Date();
  type = type || 'YYYY-MM-DD HH:mm:ss';
  return moment(dateTime).format(type);
}