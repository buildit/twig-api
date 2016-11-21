def call(name) {
  if(env.USE_GLOBAL_LIB) {
    Class.forName(name).newInstance()
  } else {
    load "lib/${name}.groovy"
  }
}
