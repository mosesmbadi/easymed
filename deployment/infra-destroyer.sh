#!/bin/bash

set -e 
set -u

REGION="us-east-1"

echo "🚨 WARNING: This script will DELETE ALL RESOURCES in AWS region $REGION 🚨"
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
    echo "Aborted!"
    exit 1
fi

echo "Deleting all resources in $REGION..."

# Terminate EC2 Instances
echo "Terminating EC2 instances..."
INSTANCE_IDS=$(aws ec2 describe-instances --region $REGION --query "Reservations[*].Instances[*].InstanceId" --output text)
if [[ -n "$INSTANCE_IDS" ]]; then
    aws ec2 terminate-instances --region $REGION --instance-ids $INSTANCE_IDS
fi

# Delete Security Groups (except default)
echo "Deleting security groups..."
SECURITY_GROUPS=$(aws ec2 describe-security-groups --region $REGION --query "SecurityGroups[?GroupName!='default'].GroupId" --output text)
for GROUP in $SECURITY_GROUPS; do
    aws ec2 delete-security-group --region $REGION --group-id "$GROUP"
done

# Delete Key Pairs
echo "Deleting EC2 key pairs..."
KEY_PAIRS=$(aws ec2 describe-key-pairs --region $REGION --query "KeyPairs[*].KeyName" --output text)
for KEY in $KEY_PAIRS; do
    aws ec2 delete-key-pair --region $REGION --key-name "$KEY"
done

# Delete Subnets
echo "Deleting subnets..."
SUBNETS=$(aws ec2 describe-subnets --region $REGION --query "Subnets[*].SubnetId" --output text)
for SUBNET in $SUBNETS; do
    aws ec2 delete-subnet --region $REGION --subnet-id "$SUBNET"
done

# Delete VPCs
echo "Deleting VPCs..."
VPCS=$(aws ec2 describe-vpcs --region $REGION --query "Vpcs[*].VpcId" --output text)
for VPC in $VPCS; do
    aws ec2 delete-vpc --region $REGION --vpc-id "$VPC"
done

# Delete Internet Gateways
echo "Deleting Internet Gateways..."
GATEWAYS=$(aws ec2 describe-internet-gateways --region $REGION --query "InternetGateways[*].InternetGatewayId" --output text)
for GW in $GATEWAYS; do
    aws ec2 detach-internet-gateway --region $REGION --internet-gateway-id "$GW" --vpc-id $(aws ec2 describe-vpcs --query "Vpcs[*].VpcId" --output text)
    aws ec2 delete-internet-gateway --region $REGION --internet-gateway-id "$GW"
done

# Delete S3 Buckets
# echo "Deleting S3 buckets..."
# BUCKETS=$(aws s3 ls --query "Buckets[*].Name" --output text)
# for BUCKET in $BUCKETS; do
#     aws s3 rb "s3://$BUCKET" --force
# done

# Delete DynamoDB Tables
echo "Deleting DynamoDB tables..."
TABLES=$(aws dynamodb list-tables --region $REGION --query "TableNames[*]" --output text)
for TABLE in $TABLES; do
    aws dynamodb delete-table --region $REGION --table-name "$TABLE"
done

# Delete RDS Instances
echo "Deleting RDS instances..."
DB_INSTANCES=$(aws rds describe-db-instances --region $REGION --query "DBInstances[*].DBInstanceIdentifier" --output text)
for DB in $DB_INSTANCES; do
    aws rds delete-db-instance --region $REGION --db-instance-identifier "$DB" --skip-final-snapshot
done

# Delete Elastic Load Balancers
echo "Deleting ELB Load Balancers..."
ELB_NAMES=$(aws elb describe-load-balancers --region $REGION --query "LoadBalancerDescriptions[*].LoadBalancerName" --output text)
for ELB in $ELB_NAMES; do
    aws elb delete-load-balancer --region $REGION --load-balancer-name "$ELB"
done

# Delete ECS Clusters
echo "Deleting ECS clusters..."
ECS_CLUSTERS=$(aws ecs list-clusters --region $REGION --query "clusterArns[*]" --output text)
for CLUSTER in $ECS_CLUSTERS; do
    aws ecs delete-cluster --region $REGION --cluster "$CLUSTER"
done

# Delete CloudFormation Stacks
echo "Deleting CloudFormation stacks..."
STACKS=$(aws cloudformation list-stacks --region $REGION --query "StackSummaries[*].StackName" --output text)
for STACK in $STACKS; do
    aws cloudformation delete-stack --region $REGION --stack-name "$STACK"
done

# Delete IAM Users (Dangerous! Use with caution)
# echo "Deleting IAM users..."
# USERS=$(aws iam list-users --query "Users[*].UserName" --output text)
# for USER in $USERS; do
#     aws iam delete-user --user-name "$USER"
# done

echo "✅ Deletion process complete for region $REGION!"

echo "🚨 WARNING: This script will DELETE ALL RESOURCES in AWS region $REGION 🚨"