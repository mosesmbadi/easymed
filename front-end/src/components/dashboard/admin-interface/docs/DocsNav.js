import React from 'react'

const sections = [
  { key: 'inventory', label: 'Inventory & Pack System' },
  { key: 'lab', label: 'Lab Tests & Reagents' },
  { key: 'billing', label: 'Billing & Invoices' },
]

const DocsNav = ({ selectedSection, setSelectedSection }) => {
  return (
    <ul className='flex flex-row gap-4 items-center border-b pb-2 mb-4'>
      {sections.map((section) => (
        <li
          key={section.key}
          className={`cursor-pointer px-2 py-1 rounded text-sm ${
            selectedSection === section.key
              ? 'font-semibold text-primary border-b-2 border-primary'
              : 'text-gray-600 hover:text-primary'
          }`}
          onClick={() => setSelectedSection(section.key)}
        >
          {section.label}
        </li>
      ))}
    </ul>
  )
}

export default DocsNav
