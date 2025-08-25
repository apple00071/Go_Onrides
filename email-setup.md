# Email Setup Instructions

To enable daily email reports, you need to add the following environment variables to your `.env.local` file:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
ADMIN_EMAIL=admin@goonrides.com
CRON_SECRET=your-secret-key-for-cron-jobs
```

## Steps to Set Up Gmail for Sending Emails

1. Create or use an existing Gmail account
2. Enable 2-Step Verification in your Google Account settings
3. Generate an App Password:
   - Go to Google Account settings
   - Navigate to Security
   - Under "2-Step Verification", click on "App passwords"
   - Select "Mail" and your device
   - Click "Generate"
   - Use the generated 16-character password as your EMAIL_PASSWORD

## Environment Variables Explanation

- EMAIL_USER: Your Gmail address that will send the reports
- EMAIL_PASSWORD: The App Password generated from Gmail (not your regular password)
- ADMIN_EMAIL: The email address where you want to receive daily reports
- CRON_SECRET: A secret key to secure the API endpoint (generate a random string)

## Setting Up the Cron Job

You can use a service like cron-job.org to trigger the daily report:

1. Create an account at cron-job.org
2. Create a new cron job with these settings:
   - URL: https://your-domain.com/api/reports/daily
   - Method: GET
   - Headers: Add "Authorization: Bearer your-cron-secret"
   - Schedule: Every day at your preferred time (e.g., 23:59)

Alternatively, you can use other services like:
- Vercel Cron Jobs (if hosted on Vercel)
- AWS Lambda with EventBridge
- GitHub Actions with cron schedule 