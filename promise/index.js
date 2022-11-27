class IPromise {

    constructor(executor) {
      // 存储promise结果
      this.promiseResult = undefined;
      // 存储promise的状态
      this.promiseState = 'pending';
      // 存储所有的回调函数
      this.callbackList = [];
      
      // resolve方法，将promiseState变为fulfilled，并修改promiseResult
      const resolve = (value) => {
        // 仅在promiseState为pending的时候变化
        if (this.promiseState !== 'pending') return;
        // 将promiseState变为fulfilled
        this.promiseState = 'fulfilled';
        // 将value作为promiseResult
        this.promiseResult = value;
        // 异步执行所有回调函数
        setTimeout(()=>{
          this.callbackList.forEach(cb => cb.onResolved(value));
        })
      }
      
      // reject方法，将promiseState变为rejected，并修改promiseResult
      const reject = (error) => {
        // 仅在promiseState为pending的时候变化
        if (this.promiseState !== 'pending') return;
        // 将promiseState变为rejected
        this.promiseState = 'rejected';
        // 将error作为promiseResult
        this.promiseResult = error;
        // 异步执行所有回调函数
        setTimeout(()=>{
          this.callbackList.forEach(cb => cb.onRejected(error));
        })
      }
      
      // 立即执行executor
      // executor函数执行出现错误，会调用reject方法
      try {
        executor(resolve, reject);
      } catch (error) {
        reject(error);
      }
    }
    // 接收两个回调函数作为参数
    then(onResolved, onRejected) {
      //处理异常穿透并且为onResolved，onRejected设置默认值。因为这两个参数可以都不传
      if (typeof onRejected !== 'function') {
        onRejected = err => {
          throw err;
        }
      }
      if (typeof onResolved !== 'function') {
        onResolved = val => val;
      }
      /*
      * 这里必须要写箭头函数，否则this会指向新的Promise对象
      * 进而导致取不到promiseState和promiseResult
      */
      return new IPromise((resolve, reject) => {
        /*
        * 回调处理函数
        * 这里也请记得用箭头函数，this要穿透几层
        * 箭头函数就用几层
        */
        const handleCallback = (callback) => {
          try {
            let res = callback(this.promiseResult);
            // 若返回值是promise对象
            if (res instanceof IPromise) {
              res.then(val => resolve(val), err => reject(err));
            } else {
              // 若不是
              resolve(res);
            }
          } catch (error) {
            reject(error);
          }
        }
        // promiseState为fulfilled时调用onResolved
        if (this.promiseState === "fulfilled") {
          setTimeout(() => {
            handleCallback(onResolved);
          });
        }
        // promiseState为rejected时调用onRejected
        if (this.promiseState === "rejected") {
          setTimeout(() => {
            handleCallback(onRejected);
          });
        }
        /*
        * 如果是pending状态，则异步任务，在改变状态的时候去调用回调函数
        * 所以要保存回调函数
        * 因为promise实例可以指定多个回调，于是采用数组 
        */
        if (this.promiseState === "pending") {
          this.callbackList.push({
            onResolved: () => {
              handleCallback(onResolved)
            },
            onRejected: () => {
              handleCallback(onRejected)
            }
          })
        }
      })
    }
  
    catch(onRejected) {
      return this.then(undefined, onRejected);
    }
  
    static resolve(value) {
      return new IPromise((resolve, reject) => {
        if (value instanceof IPromise) {
          value.then(val => resolve(val), err => reject(err));
        } else {
          resolve(value)
        }
      })
    }
  
    static reject(error) {
      return new IPromise((resolve, reject) => {
        reject(error);
      })
    }
  
    static all(promiseArrays) {
      return new IPromise((resolve, reject) => {
        // 用以存储执行的结果
        let results = [];
        let length  = promiseArrays.length;
        promiseArrays.forEach((promiseObj, index, promiseArrays) => {
          promiseObj.then((val) => {
            results.push(val);
            // 由于是多个异步任务的关系，需要判断是否都执行完毕
            if (results.length === length) {
              resolve(results);
            }
          }, err => {
            // 如有错误，则reject
            reject(err);
          });
        })
      })
    }
  
    static race(promiseArrays) {
      return new IPromise((resolve, reject) => {
        promiseArrays.forEach(promiseObj => {
          promiseObj.then(val => {
            resolve(val);
          }, err => {
            reject(err);
          });
        });
      })
    }
  }
