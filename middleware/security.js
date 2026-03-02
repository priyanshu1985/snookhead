const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' data: https://cdnjs.cloudflare.com https://r2cdn.perplexity.ai; img-src 'self' data: https:; connect-src 'self' http://localhost:4000 ws://localhost:5173 https://fciukqmsyflflzdytqrt.supabase.co;"
  );
  res.removeHeader("X-Powered-By");
  next();
};

export { securityHeaders };
