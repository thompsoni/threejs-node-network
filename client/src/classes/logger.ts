import { configSettings } from './config';

class LoggerClass {

    constructor() {
    }

    public log(arg: any, arg2?: any, arg3?: any) {
        if ( configSettings.DEBUG ) {
            if ( arg2 && arg3 ) {
                console.log(arg, arg2, arg3);
            } else if ( arg2 ) {
                console.log(arg, arg2);
            } else {
                console.log(arg);
            }
        }
    }

    public warn(arg: any, arg2?: any, arg3?: any) {
        if ( arg2 && arg3 ) {
            console.warn(arg, arg2, arg3);
        } else if ( arg2 ) {
            console.warn(arg, arg2);
        } else {
            console.warn(arg);
        }
    }

    public error(arg: any, arg2?: any, arg3?: any) {
        if ( arg2 && arg3 ) {
            console.error(arg, arg2, arg3);
        } else if ( arg2 ) {
            console.error(arg, arg2);
        } else {
            console.error(arg);
        }
    }
}

export const Logger = new LoggerClass();
