const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${new Date().toISOString()} ${method} ${url} ${statusCode} ${duration}ms ${ip}`);
    }
  });
  
  next();
};

module.exports = { requestLogger };