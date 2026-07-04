const https = require('https');

const options = {
  hostname: 'jsearch.p.rapidapi.com',
  path: '/search?query=Frontend%20Software%20Engineer&page=1&num_pages=1&remote_jobs_only=true',
  method: 'GET',
  headers: {
    'x-rapidapi-key': 'ceeb87a502msh35fce454a8891c1p1f7d05jsnc2d1b540f888',
    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
