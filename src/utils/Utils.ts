export const isDev = () => !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

export const sleep = (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};