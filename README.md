# Getting Started

Repository for Make-Easy HMIS

---

# 1. How to Run the Project

The project is divided into two parts, the frontend and the backend.
The frontend is built with Next.js and the backend with Django (DRF), PostgreSQL, Celery and Redis. The easiest way to get started is to use Docker. In the root directory
there is a `docker-compose-local.yml` file that will set up all
the services you need including celery and redis. Please note that we have two compose files; `docker-compose-local.yml` and `docker-compose.yml`. The latter is used for prod environment, so no need to touch that.

## i. Running with Docker

First thngs first, we need a `.env` file in our root directory. You can simply copy everything inside the `.env.sample` into `.env` and update the variables accordingly.
The assumption here is you're setting up locally for dev (Refer to our LICENCE!):
Run this comand: `docker compose -f docker-compose-local.yml up`
Frontend will be running on `http://127.0.0.1:3000` and backend on `http://127.0.0.1:8000`
This will set up all the services you need including celery and redis.
After the steps above, jump to Adding Permissions and add permissions. You can also check notifications while at it.


To register patients using landing page, create a group in django Admin called PATIENT, but we'll dive deeper in this in the permissions section.

To browse available endpoints, visit:

```
127.0.0.1:8085/docs/swagger/
```

### Celery and Redis

If not installed already, install celery and redis INSIDE YOUR VIRTUAL ENV
`pip install celery redis`
Run Celery: `celery -A easymed worker --loglevel=INFO`
Run Redis: `redis-cli -h 127.0.0.1 -p 6379`

### Celery beat

If not installed already, install celery and redis INSIDE YOUR VIRTUAL ENV
`pip install celery redis`
Run Celery: `celery -A easymed beat --loglevel=INFO`

## Frontend

The backend url is updated inside `.env`
i.e NEXT_PUBLIC_BACKEND_URL=http://<your-private-ip-address>:8080/

If you want to run frontend outside of docker, you will need to create a .env file in the same directory as the src folder then add the following:

```
NEXT_PUBLIC_BACKEND_URL=http://<your-private-ip-address>:8080/
NEXT_PUBLIC_HMIS_VERSION=v0.0.1-alpha-0.1
NEXT_PUBLIC_BASE_URL=""
```

You can get your private IP by running `ifconfig` on Linux or `ipconfig` on Windows.

Install dependencies:

```
npm install
```

Lastly run the development server using:

```
npm run dev
```

Dev version can be a little slow. To run a faster build version, use the following commands:

```
npm run build
npm start
```

Visit localhost `127.0.0.1:3000/dashboard`
For you to borwse through frontend pages, you will need to set up permissions. So, let's go back to backend and add permission and groups.

---

# 2. Adding Permissions

The steps below are performed inside the django admin interface.
You need to create groups and associate permissions. make sure groups follow this order `SYS_ADMIN`, `PATIENT` group then the rest ie `DOCTOR`,`PHARMACIST`, `RECEPTIONIST`, `LAB_TECH` , `NURSE`
Then create permissions below and link to the groups.
N/B: Frontend will not work without permissions and groups set up.
Create super user then navigate to `127.0.0.1::8080/admin` and add permissions;

- Doctor Dashboard => `CAN_ACCESS_DOCTOR_DASHBOARD`
- General Dashboard => `CAN_ACCESS_GENERAL_DASHBOARD`
- Admin Dashboard => `CAN_ACCESS_ADMIN_DASHBOARD`
- Reception Dashboard => `CAN_ACCESS_RECEPTION_DASHBOARD`
- Nursing Dashboard => `CAN_ACCESS_NURSING_DASHBOARD`
- Laboratory Dashboard => `CAN_ACCESS_LABORATORY_DASHBOARD`
- Patients Dashboard => `CAN_ACCESS_PATIENTS_DASHBOARD`
- AI ASSISTANT Dashboard => `CAN_ACCESS_AI_ASSISTANT_DASHBOARD`
- Announcement Dashboard => `CAN_ACCESS_ANNOUNCEMENT_DASHBOARD`
- Pharmacy Dashboard => `CAN_ACCESS_PHARMACY_DASHBOARD`
- Inventory Dashboard => `CAN_ACCESS_INVENTORY_DASHBOARD`
- Billing Dashboard => `CAN_ACCESS_BILLING_DASHBOARD`
- Settings Dashboard => `CAN_ACCESS_ADMIN_DASHBOARD` -`CAN_RECEIVE_INVENTORY_NOTIFICATIONS`

You will notice that we have a Role and a Group. A group is associated with permissions which determines which specific dashboards a user is allowed to access. A role helps differentiate staff from patients hence redirecting to patient profile if patient and to general dashboard if staff.

If doing all these manually sounds like too much work, you can run the command below to create the groups and permissions automatically.

```
python manage.py generate_dummy_data
```

This should be the output:

```
created 50 dummy users.
Created 50 dummy companies.
Created 2500 dummy company branches.
Created 50 dummy insurance companies.
Created 50 dummy inventory items.
Created default groups and permissions.
Created 50 dummy patients.
Created 6 lab test profiles and 13 panels
```


---

# 3. Notifications

### i. Testing Socket connection for notifications

Django's runserver (`python manage.py runserver 0.0.0.0:8080`) does not support asgi (socket connections required for notifications), run with uvicorn to have the notifications working
`uvicorn --port 8080 easymed.asgi:application`

Currently, the notifications are sent to the group `doctor_notifications` and `inventory_notifications`

On a separate terminal
`npm install -g wscat`

### ii. Patient Notifications

On a separate terminal
`wscat -c ws://localhost:8080/ws/doctor_notifications/` <-- appointment assigned notification will be seen here

### iii. Inventory Notifications

First navigate to the admin panel and assign permission`CAN_RECEIVE_INVENTORY_NOTIFICATIONS` to a group to ensure specific users receive notifications via email

Example:

- Group: `LAB_TECH`
- Permission: `CAN_RECEIVE_INVENTORY_NOTIFICATIONS`

on a separate terminal
`wscat -c ws://localhost:8080/ws/inventory_notifications/` <-- inventory notification will be seen here

---

# 4. A word on patient processes

Each process starting form Appointment, should be billed first before it's actioned.
For Billing to work, these should be updated in order:

1. Patient must have Insurance if not, cash will be picked by default.
2. Payment Modes should be updated in that regard ()
3. Items must exist
4. Inventory for items must be present
5. InsuranceSalePrise for specific Items depending on the Insurance (a signal handle this for now. Refer to Inventory signals)

## Invoicing process

For Invoicing to work properly, you need to:
1. create an Item, 
2. Add the item to the inventory Inventory>Items>Add New Item
33. Create an InsuranceSalePrice for that item. Finance>Accounts Receivable>Settings>Insurance Prices


# 5. Reporting

### Sale by Date Range

To generate sales by given date, send sample request as shown below
`curl -X POST http://127.0.0.1:8080/reports/sale_by_date/   -H "Content-Type: application/json"   -d '{"start_date": "2024-02-01", "end_date": "2024-02-18"}' > report-log.txt`
curl
The `> report-log.txt` just dumps the logs to the report-log.txt file for troubleshooting.

If sending directly from frontend, just configure the payload and send to the endpoint `http://127.0.0.1:8080/reports/sale_by_date/ `
You can access the generated report here
`http://127.0.0.1:8080/sale_by_date/pdf/`

### Sale by Date Range and Item Id

To generated sales report by date range and given item id;
`curl -X POST http://127.0.0.1:8080/reports/sale_by_item_and_date/   -H "Content-Type: application/json"   -d '{"item_id": "1", "start_date": "2024-02-01", "end_date": "2024-02-10"}'`

You can access the generated pdf here `/serve_sales_by_item_id_pdf/`

### Sales by payment mode

Send POST request to the endpoint below, teh response will have the total amount
for a given payment mode
`/reports/total_payment_mode_amount/?payment_mode=insurance&date=2024-02-18`

### Lab reports

By default, or when explicitly specified, all lab test will be quantitative and will use the following endpoints. In the same order, create a report, add test-panel-results to that report
then generate the pdf report
`/lab/lab-test-results/`
`/lab/lab-test-results-panel/`
`/download_labtestresult_pdf/<int:labtestresult_id>/`

To get a test result report for a particular patient, you send a GET request to this endpoint:
`http://127.0.0.1:8080/download_labtestresult_pdf/{processtestrequest_id}`

### Doctor Reports

This will give you all appointments by given doctor and date range
http://127.0.0.1:8080/patients/report/appointments/?doctor_id=1&start_date=2024-08-01&end_date=2024-08-31

If no date range is specified it will get you a report for all appointments
http://127.0.0.1:8080/patients/report/appointments/?doctor_id=2

### Goods Receipt note

Generates a receipt note for incoming items
`http://127.0.0.1:8080/inventory/receipt-note/{purchade_order_id}/`

### Supplier Invoice Report

This will give us a report of all invoices by a given supplier. Can be used to
show account details for a given supplier
`http://127.0.0.1:8080/inventory/supplier-invoice-report/{supplier_id}/`

---

# 6. Laboratory Integration

Due to the complexity of the lab module, the integration will be handled by a parser which
is hosted on a separate repository [here](https://github.com/mosesmbadi/hl7_astm_parser).
Here's an overview of the process;

1. The parser listens to a specific port for incoming messages
2. If incoming message is HL7 or ASTM, it converts to JSON and sends to the backend
3. The backend receives the JSON and saves to the database
4. If the incoming message is JSON, the parser will extract the equipment name, convirts the JSON to HL7 or ASTM and sends to the equipment.

---

# 7 System Requirements

Minimum system specifications
RAM 8GB
Disk SSD 250GB (only 20GB is needed for the project)
CPU i3-10th Gen and above

Other requirements;
The system uses TCP to primarily integret with Equipment.
For equipment with any other form of coms other than TCP/Ethernet,
will need to be configured with additional hardware that converts
the coms to TCP
A device such us [this](https://www.whizz.co.ke/product/1443079/usr-tcp232-302-tiny-size-rs232-to-tcp-ip-converter-serial-rs232-to-ethernet-server-module-ethernet-converter-support-dhcp-dns/), can work.

---

# 8 Deployment with Terraform, Ansible and Github Action

First things first, you need to configure your AWS credentials. The assumption is you're on Linux and are familiar with aws cli. You can do this by running `aws configure` and entering your credentials.
You can also set the credentials in the `~/.aws/credentials` file.

Next, you need to have terraform and ansible installed. You can install terraform by following the instructions [here](https://learn.hashicorp.com/tutorials/terraform/install-cli) and ansible by following the instructions [here](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html).

After the prerequisites are out of the way, you can now proceed to deploy the application. The deployment process is divided into two parts, the infrastructure and the application.

First CD into /deployment directory and run the following commands:

> CAUTION: The commands below will provison services in AWS!! We SHALL NOT be held liable for any damages!! Refer to LICENSE.

Commands to run terraform

```bash
terraform init
terraform plan
terraform apply
```

To destroy all resources created
`terraform destroy`

That will provision our infrastracture. We then let ansible take care of the rest:
`ansible-playbook -i inventory.ini ansible-playbook.yml`

> If you want to automate the deployment, we use Github actions. The entire deployment process is handled by the github actions. You can check the actions in the `.github/workflows` directory.

### Monitoring

Monitoring will be handled by Prometheus and Grafana.
To test the backend metrics manually, hit this endpoint `/metrics`

### Trubleshooting

If you get an error saying invalid AMI, you can check the available AMIs in your region by running the command below:
`aws ec2 describe-images --owners amazon --filters "Name=name,Values=ubuntu/images/*" --region us-east-1`

# 9. SCREENSHOTS

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <img src="./screenshots/screenshot-35-50.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-35-57.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-36-05.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-36-16.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-36-26.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-36-43.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-37-05.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-38-23.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-38-32.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-38-41.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-38-48.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-38-59.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
  <img src="./screenshots/screenshot-39-10.png?raw=true" alt="EasyMed-HMIS-Screenshots" width="220" />
</div>

---

Like the project? Help us buy more coffee 🙂: <br/> 
[☕ Donate with PayPal](https://www.paypal.com/donate/?hosted_button_id=45A3RRNJMNAGQ) ||
[₿ Donate with Bitcoin](https://www.blockchain.com/btc/address/bc1q9cymjyzt7zj28zcztjafys0sur329gektd4zzh)

---

Rev 1.2.0

Last revised on June, 5, 2025, by [Moses Mbadi](https://www.linkedin.com/in/moses-mbadi-0b8500198/)
