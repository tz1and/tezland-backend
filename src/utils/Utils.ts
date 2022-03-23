// NOTE: will return true for staging.
export const isDev = () => !process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging';

export const sleep = (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};