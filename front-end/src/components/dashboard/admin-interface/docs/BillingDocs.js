import React from 'react'

const Section = ({ title, children }) => (
  <div className='mb-6'>
    <h3 className='text-lg font-semibold text-primary mb-2'>{title}</h3>
    <div className='text-sm text-gray-700 space-y-2'>{children}</div>
  </div>
)

const Code = ({ children }) => (
  <span className='bg-gray-100 text-xs px-1.5 py-0.5 rounded font-mono'>{children}</span>
)

const Table = ({ headers, rows }) => (
  <div className='overflow-x-auto'>
    <table className='min-w-full text-xs border border-gray-200 rounded'>
      <thead>
        <tr className='bg-gray-50'>
          {headers.map((h, i) => (
            <th key={i} className='text-left px-3 py-2 font-semibold border-b'>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            {row.map((cell, j) => (
              <td key={j} className='px-3 py-2 border-b'>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const BillingDocs = () => {
  return (
    <div className='max-w-4xl'>
      <h2 className='text-xl font-bold mb-4'>Billing & Invoices</h2>

      <Section title='Invoice Structure'>
        <p>Billing follows a two-level structure:</p>
        <Table
          headers={['Level', 'Model', 'Purpose']}
          rows={[
            ['Invoice', 'Invoice', 'Top-level record per patient visit. Contains invoice number, patient, status.'],
            ['Invoice Item', 'InvoiceItem', 'Individual line item: a drug, lab test, appointment, or service.'],
          ]}
        />
      </Section>

      <Section title='Invoice Items and Quantity'>
        <p>
          Each invoice item has a <Code>quantity</Code> field (default: 1). The pricing works as follows:
        </p>
        <Table
          headers={['Field', 'Meaning']}
          rows={[
            ['unit_price', 'What one base unit was charged at, frozen when the line was billed'],
            ['quantity', 'Number of units being billed'],
            ['item_amount', 'The whole line, whoever pays: unit_price x quantity'],
            ['patient_amount', 'The patient own share: the co-pay, or all of it on a cash line'],
            ['actual_total', 'Receivable from the party the line is billed TO - the insurer on an insurance line, the patient on any other'],
          ]}
        />
        <div className='bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-2'>
          <p className='font-semibold text-blue-800'>Example</p>
          <p>
            Paracetamol, cash, 50 each, quantity 3<br />
            item_amount = 150, patient_amount = 150, actual_total = 150<br />
            <br />
            Same drug on insurance paying 40 with a 10 co-pay, quantity 3<br />
            unit_price = 50 (40 + 10), item_amount = 150<br />
            patient_amount = 30 (the co-pay), actual_total = 120 (billed to the insurer)
          </p>
        </div>
        <div className='bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-2'>
          <p className='font-semibold text-blue-800'>An insurance price is a split, not a discount</p>
          <p>
            <Code>sale_price</Code> on an insurance rate is the insurer portion and{' '}
            <Code>co_pay</Code> is the patient portion. The line is worth the two
            <strong> added together</strong>. Subtracting the co-pay from the insurer
            price under-bills the insurer by exactly what the patient already paid.
          </p>
        </div>
        <div className='bg-blue-50 border-l-4 border-blue-400 p-3 rounded mt-2'>
          <p className='font-semibold text-blue-800'>A billed line keeps its price</p>
          <p>
            Prices are effective-dated, so a line prices itself while it is pending and
            then stops. Changing an item price tomorrow does not restate an invoice
            raised today. To correct a billed line, reverse it and raise a new one.
          </p>
        </div>
      </Section>

      <Section title='Pricing Sources'>
        <p>
          When an invoice item is created, the system determines the price in this order:
        </p>
        <ol className='list-decimal pl-5 space-y-1'>
          <li>
            <strong>Insurance price</strong> — If the patient has active insurance, the system looks up
            <Code>InsuranceItemSalePrice</Code> for the specific item + insurance company. Uses the insurance
            <Code>sale_price</Code> and <Code>co_pay</Code>.
          </li>
          <li>
            <strong>Cash price</strong> — Falls back to the item&apos;s current price from the
            effective-dated price list. The patient pays the full amount.
          </li>
          <li>
            <strong>Insurance with no agreed rate</strong> — Billed at the cash price and
            charged to the <strong>patient</strong>. Nothing is claimed from an insurer who
            never agreed a rate; <Code>price_source</Code> reads <Code>cash_fallback</Code> so
            it is visible rather than silent.
          </li>
        </ol>
      </Section>

      <Section title='Payment Modes'>
        <p>Each invoice item can be paid through different modes:</p>
        <Table
          headers={['Mode', 'Description']}
          rows={[
            ['Cash', 'Default. Patient pays directly.'],
            ['Mobile Money (M-Pesa)', 'Patient pays via mobile money.'],
            ['Insurance', 'Billed to the patient\'s insurance company. Patient pays the co-pay portion.'],
          ]}
        />
        <p>
          For prescribed drugs, staff can select the payment mode per item when generating the invoice.
        </p>
      </Section>

      <Section title='Billing Lab Tests'>
        <p>When a lab test is billed:</p>
        <ol className='list-decimal pl-5 space-y-1'>
          <li>An invoice item is created using the test panel&apos;s <Code>Lab Test</Code> billing item</li>
          <li>The price is set on the <strong>Test Panel</strong> (Lab Settings &gt; Test Panels), not in Inventory — a reagent has no sale price of its own</li>
          <li>The line is <strong>refused</strong> if the panel&apos;s reagents are not in Lab stock. A lab test holds no stock itself, so this is the only thing standing between the till and selling a test the bench cannot run</li>
          <li>Reagents are deducted when a <strong>result is recorded</strong>, not when the line is billed — paying for a test is not running it</li>
          <li>The syringe and tube are deducted separately, when the <strong>sample is collected</strong>, once per draw however many tests are ordered off it</li>
        </ol>
      </Section>

      <Section title='Billing Prescribed Drugs'>
        <p>When billing drugs from a prescription:</p>
        <ol className='list-decimal pl-5 space-y-1'>
          <li>Staff selects which prescribed drugs to include on the invoice</li>
          <li>For each drug, staff can adjust the <Code>quantity</Code> and select a payment mode</li>
          <li>The total per drug is calculated as <Code>sale_price x quantity</Code></li>
          <li>A grand total is shown at the bottom of the drug list</li>
        </ol>
      </Section>

      <Section title='Viewing Invoice Items'>
        <p>
          The invoice items view shows all line items for a given invoice with these columns:
        </p>
        <Table
          headers={['Column', 'Source']}
          rows={[
            ['Code', 'item_code — the item\'s product code'],
            ['Item', 'item_name — the product or service name'],
            ['Qty', 'quantity — number of units billed'],
            ['Unit Price', 'sale_price — the frozen per-unit price the line was sold at'],
            ['Payment Mode', 'payment_mode_name — cash, insurance, etc.'],
            ['Line Total', 'item_amount — unit_price x quantity, whoever pays'],
            ['Patient Pays', 'patient_amount — the co-pay, or the whole line on cash'],
            ['Status', 'status — pending, paid, etc.'],
          ]}
        />
      </Section>

      <Section title='Key Rules'>
        <ul className='list-disc pl-5 space-y-1'>
          <li>
            <Code>sale_price</Code> is always the <strong>per-unit price</strong>.
            Total amounts are computed as <Code>sale_price x quantity</Code>.
          </li>
          <li>
            <strong>The server owns the money.</strong> All four amount fields are read-only
            on the API — the till posts a payment mode and a status and reads the amounts
            back. A screen that could post its own totals could bill any figure it liked.
          </li>
          <li>
            <Code>patient_amount</Code> and the insurer share always add back up to{' '}
            <Code>item_amount</Code>. Neither is reconstructed by subtracting one from
            the other.
          </li>
          <li>
            Insurance prices are <strong>not</strong> created automatically. Agree them under
            Billing Settings &gt; Insurance Prices. An insured line with no agreed price bills
            at the cash price, to the patient.
          </li>
          <li>
            Invoices are linked to patient visits. One visit can have multiple invoices.
          </li>
        </ul>
      </Section>
    </div>
  )
}

export default BillingDocs
