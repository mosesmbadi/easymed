#!/bin/bash

python manage.py shell <<EOF
from authperms.models import Group, Permission

# Create the groups
groups = ['SYS_ADMIN', 'PATIENT', 'DOCTOR', 'PHARMACIST', 'RECEPTIONIST', 'LAB_TECH', 'NURSE']
for group_name in groups:
    Group.objects.get_or_create(name=group_name)

# Create the permissions
permissions = ['CAN_ACCESS_DOCTOR_DASHBOARD', 'CAN_ACCESS_GENERAL_DASHBOARD', 'CAN_ACCESS_ADMIN_DASHBOARD', 'CAN_ACCESS_RECEPTION_DASHBOARD', 'CAN_ACCESS_NURSING_DASHBOARD', 'CAN_ACCESS_LABORATORY_DASHBOARD', 'CAN_ACCESS_PATIENTS_DASHBOARD', 'CAN_ACCESS_AI_ASSISTANT_DASHBOARD', 'CAN_ACCESS_ANNOUNCEMENT_DASHBOARD', 'CAN_ACCESS_PHARMACY_DASHBOARD', 'CAN_ACCESS_INVENTORY_DASHBOARD', 'CAN_ACCESS_BILLING_DASHBOARD', 'CAN_RECEIVE_INVENTORY_NOTIFICATIONS']
for permission_name in permissions:
    Permission.objects.get_or_create(name=permission_name)

# Associate the SYS_ADMIN group with all permissions
sys_admin_group = Group.objects.get(name='SYS_ADMIN')
permissions = Permission.objects.all()
sys_admin_group.permissions.set(permissions)
EOF