const { Resend } = require('resend');

const resend = new Resend('re_F7B8KBhP_9YCmZQ87yVQ6Y8QjGFbpzUGu');

async function test() {
  try {
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'moogibarathi@gmail.com',
      subject: '✅ Test: Applyra Email Notification',
      html: '<h1>Email test successful!</h1><p>Your Applyra email notifications are working!</p>',
    });
    console.log('SUCCESS:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('DETAILS:', JSON.stringify(err, null, 2));
  }
}

test();
