export type MarketplacePolicyPage = {
  slug: string
  title: string
  subtitle: string
  lastUpdated: string
  sections: {
    title: string
    body: string[]
  }[]
}

export const MARKETPLACE_POLICY_PAGES: Record<string, MarketplacePolicyPage> = {
  'marketplace-terms': {
    slug: 'marketplace-terms',
    title: 'DigitalHood Marketplace Terms',
    subtitle:
      'The operating rules for buyers, sellers and DigitalHood on the Zambia marketplace.',
    lastUpdated: '2026-07-06',
    sections: [
      {
        title: 'Marketplace role',
        body: [
          'DigitalHood operates an online marketplace connecting customers in Zambia with DigitalHood-owned products and approved third-party sellers.',
          'Where a product is sold by a third-party seller, that seller remains responsible for product accuracy, availability, authenticity, warranty handling, legal compliance and fulfilment obligations unless DigitalHood clearly states otherwise.',
        ],
      },
      {
        title: 'Zambia-first scope',
        body: [
          'DigitalHood Marketplace currently operates for customers, delivery locations and sellers in Zambia.',
          'Orders, delivery estimates, payment options and customer support processes are designed for Zambia first. International expansion may be added later under updated marketplace terms.',
        ],
      },
      {
        title: 'Customer information',
        body: [
          'Customers must provide accurate contact, delivery and order information.',
          'DigitalHood may use order, delivery, payment reference and support information to process transactions, prevent fraud, handle disputes and improve marketplace safety.',
        ],
      },
      {
        title: 'Pricing, delivery and records',
        body: [
          'Product prices, delivery fees, delivery estimates and payment methods should be shown before checkout completion.',
          'Customers should keep order numbers, payment references and support case numbers for follow-up.',
        ],
      },
    ],
  },

  'seller-terms': {
    slug: 'seller-terms',
    title: 'Seller Terms & Responsibilities',
    subtitle:
      'Rules every approved seller must follow before selling on DigitalHood Marketplace.',
    lastUpdated: '2026-07-06',
    sections: [
      {
        title: 'Seller responsibility',
        body: [
          'Sellers are responsible for the products they list, including product ownership, authenticity, safety, condition, description, price, stock availability, warranty terms and delivery readiness.',
          'A seller must not list goods that are illegal, unsafe, counterfeit, misleading, stolen, restricted or not physically available for fulfilment.',
        ],
      },
      {
        title: 'Product information',
        body: [
          'Sellers must provide clear product names, accurate specifications, real photos where required, pricing, stock status, warranty information and any condition notes.',
          'DigitalHood may review, reject, suspend, unpublish or remove any product listing that does not meet marketplace standards.',
        ],
      },
      {
        title: 'Customer claims and indemnity',
        body: [
          'Where a customer claim arises from a seller product, the seller may be required to assist with investigation, replacement, refund, repair, warranty support or evidence.',
          'The seller is expected to protect DigitalHood from losses, penalties, disputes or claims caused by the seller’s unlawful, unsafe, counterfeit, misleading or negligent conduct.',
        ],
      },
      {
        title: 'Seller account control',
        body: [
          'DigitalHood may suspend or restrict seller tools where there are unresolved customer complaints, suspected fraud, policy violations, unsafe products or failure to fulfil orders.',
          'Seller approval does not create employment, partnership or agency unless expressly agreed in writing.',
        ],
      },
    ],
  },

  'prohibited-products': {
    slug: 'prohibited-products',
    title: 'Prohibited & Restricted Products Policy',
    subtitle:
      'Products that cannot be sold or may require review before listing on DigitalHood.',
    lastUpdated: '2026-07-06',
    sections: [
      {
        title: 'Strictly prohibited',
        body: [
          'Counterfeit products, stolen goods, illegal goods, unsafe electronics, fake accessories, misleading branded products and products that infringe intellectual property rights are not allowed.',
          'Products that present safety, health, fraud, privacy or legal risks may be blocked even if they are not specifically listed here.',
        ],
      },
      {
        title: 'Restricted or review-required',
        body: [
          'High-risk electronics, refurbished devices, repair parts, batteries, power adapters, telecom equipment and products with regulatory implications may require extra review, proof of source, warranty terms or compliance evidence.',
          'DigitalHood may require invoices, supplier proof, serial checks, photos, certificates or additional information before approval.',
        ],
      },
      {
        title: 'Enforcement',
        body: [
          'DigitalHood may reject, remove, archive, unpublish or suspend listings that violate this policy.',
          'Repeated or serious violations may lead to seller suspension, permanent removal, withheld seller privileges or escalation to the appropriate authorities where required.',
        ],
      },
    ],
  },

  'dispute-resolution': {
    slug: 'dispute-resolution',
    title: 'Returns, Refunds & Dispute Resolution',
    subtitle:
      'How DigitalHood handles order issues, returns, refunds, replacements and seller disputes.',
    lastUpdated: '2026-07-06',
    sections: [
      {
        title: 'Order support cases',
        body: [
          'Customers should raise order issues through the DigitalHood support or order case system with the order number, product details, issue description and any photos or evidence requested.',
          'DigitalHood may review order status, payment references, seller information, delivery information, product photos and conversation history when handling a case.',
        ],
      },
      {
        title: 'Possible outcomes',
        body: [
          'Depending on the issue, DigitalHood may recommend troubleshooting, repair, replacement, return, refund, seller response, delivery follow-up or case closure.',
          'Refund or return eligibility depends on the product, condition, seller terms, issue type, timing, evidence and marketplace policy.',
        ],
      },
      {
        title: 'Seller cooperation',
        body: [
          'Sellers are expected to respond to DigitalHood support requests and provide evidence or remedy options where a dispute involves their product.',
          'Failure to cooperate may affect seller status, payout review, product visibility or seller account access.',
        ],
      },
    ],
  },

  'data-protection': {
    slug: 'data-protection',
    title: 'Data Protection & Privacy Operations',
    subtitle:
      'How DigitalHood handles customer, seller, order and support data for the Zambia marketplace.',
    lastUpdated: '2026-07-06',
    sections: [
      {
        title: 'Data collected',
        body: [
          'DigitalHood may collect customer names, phone numbers, email addresses, delivery addresses, order details, payment references, support messages, seller business details and security logs.',
          'DigitalHood does not need to store full card details because card processing should be handled by payment providers.',
        ],
      },
      {
        title: 'Data access',
        body: [
          'Sellers should only receive customer data needed to fulfil confirmed orders, such as item details and delivery contact information relevant to that order.',
          'Admin access should be limited, logged and used only for support, fulfilment, fraud prevention, compliance, security and marketplace operations.',
        ],
      },
      {
        title: 'Retention and deletion',
        body: [
          'DigitalHood may retain order, payment, seller, support and audit records for business, tax, fraud-prevention, security and dispute-resolution purposes.',
          'Customers and sellers may contact DigitalHood to request help with personal information, subject to legal, operational and dispute-resolution requirements.',
        ],
      },
    ],
  },

  'incident-response': {
    slug: 'incident-response',
    title: 'Security Incident Response Policy',
    subtitle:
      'How DigitalHood prepares for privacy, security, fraud and operational incidents.',
    lastUpdated: '2026-07-06',
    sections: [
      {
        title: 'Incident types',
        body: [
          'An incident may include suspected account compromise, unauthorized admin access, payment reference abuse, seller fraud, customer data exposure, malware, phishing, suspicious order activity or system outage.',
          'DigitalHood should record incident time, affected systems, affected users, evidence, actions taken, responsible persons and final resolution.',
        ],
      },
      {
        title: 'Response process',
        body: [
          'DigitalHood should identify the incident, contain the issue, preserve evidence, assess customer/seller impact, communicate where required, fix the root cause and document lessons learned.',
          'High-risk incidents should be escalated to management and relevant technical, legal, payment or regulatory contacts where necessary.',
        ],
      },
      {
        title: 'Prevention controls',
        body: [
          'DigitalHood should maintain MFA for admin access, audit logs, least-privilege access, backups, secure payment handling, support case records and seller review workflows.',
          'Policies must be supported by real system controls, not only written documents.',
        ],
      },
    ],
  },
}

export const MARKETPLACE_POLICY_LINKS = Object.values(MARKETPLACE_POLICY_PAGES).map(
  (page) => ({
    name: page.title,
    href: `/${page.slug}`,
  })
)
