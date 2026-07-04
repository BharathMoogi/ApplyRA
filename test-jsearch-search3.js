const https = require('https');

const options = {
  hostname: 'jsearch.p.rapidapi.com',
  path: '/search?query=Frontend',
  method: 'GET',
  headers: {
    'x-rapidapi-key': 'ceeb87a502msh35fce454a8891c1p1f7d05jsnc2d1b540f888',
    'x-rapidapi-host': 'jsearch.p.rapidapi.com'
  }
};

const options2 = {
  ...options,
  path: '/search-v2?query=Frontend'
};

const req = https.request(options2, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
});

req.end();
