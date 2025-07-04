#!/bin/bash

# AWS Elastic Beanstalk Environment Variables Setup
# Run this script to configure all necessary environment variables

echo "🔧 Setting up AWS Elastic Beanstalk Environment Variables..."

# Basic Configuration
aws elasticbeanstalk update-environment \
  --environment-name operabase-backend-mvp \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=NODE_ENV,Value=production \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=PORT,Value=8080 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=AWS_REGION,Value=sa-east-1

echo "✅ Basic environment variables configured"

echo ""
echo "📋 Next Steps:"
echo "1. Configure your Supabase credentials:"
echo "   aws elasticbeanstalk update-environment --environment-name operabase-backend-mvp --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=SUPABASE_URL,Value=YOUR_SUPABASE_URL"
echo ""
echo "2. Configure Redis URL (get from ElastiCache):"
echo "   aws elasticbeanstalk update-environment --environment-name operabase-backend-mvp --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=REDIS_URL,Value=redis://YOUR_REDIS_ENDPOINT:6379"
echo ""
echo "3. Configure API Keys:"
echo "   aws elasticbeanstalk update-environment --environment-name operabase-backend-mvp --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=OPENAI_API_KEY,Value=YOUR_OPENAI_KEY"
echo ""
echo "4. Check GitHub Actions deployment:"
echo "   https://github.com/caiorodrigo10/operabase-backend/actions"
echo ""
echo "🚀 Your backend will be available at:"
echo "   http://operabase-backend-mvp.sa-east-1.elasticbeanstalk.com" 