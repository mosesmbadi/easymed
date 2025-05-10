#!/bin/sh
python manage.py collectstatic --no-input
python manage.py migrate


# We popiulate the authperms table with the groups and permissions
python manage.py shell <<EOF
from authperms.models import Group, Permission
import sys

# Groups to create
groups = ['SYS_ADMIN', 'PATIENT', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECH', 'NURSE']

# Check if any of the groups already exist
existing = Group.objects.filter(name__in=groups)
if existing.exists():
    print("One or more groups already exist. Aborting.")
    sys.exit(1)

# Create the groups
for group_name in groups:
    Group.objects.create(name=group_name)

# Create the permissions
permissions = [
    'CAN_ACCESS_DOCTOR_DASHBOARD',
    'CAN_ACCESS_GENERAL_DASHBOARD',
    'CAN_ACCESS_ADMIN_DASHBOARD',
    'CAN_ACCESS_RECEPTION_DASHBOARD',
    'CAN_ACCESS_NURSING_DASHBOARD',
    'CAN_ACCESS_LABORATORY_DASHBOARD',
    'CAN_ACCESS_PATIENTS_DASHBOARD',
    'CAN_ACCESS_AI_ASSISTANT_DASHBOARD',
    'CAN_ACCESS_ANNOUNCEMENT_DASHBOARD',
    'CAN_ACCESS_PHARMACY_DASHBOARD',
    'CAN_ACCESS_INVENTORY_DASHBOARD',
    'CAN_ACCESS_BILLING_DASHBOARD',
    'CAN_RECEIVE_INVENTORY_NOTIFICATIONS'
]

for permission_name in permissions:
    Permission.objects.get_or_create(name=permission_name)

# Associate the SYS_ADMIN group with all permissions
sys_admin_group = Group.objects.get(name='SYS_ADMIN')
all_permissions = Permission.objects.all()
sys_admin_group.permissions.set(all_permissions)
EOF


exec "$@"
