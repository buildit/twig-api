def call(name) {
  if(env.USE_GLOBAL_LIB) {
    Eval.me("new ${name}()")
  } else {
    load "lib/${name}.groovy"
  }
}

return this
