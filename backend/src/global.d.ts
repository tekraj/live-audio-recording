declare global {
  namespace NodeJS {
    interface Global {
      __basedir: object;
    }
  }
}

export default global;
