const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clientMain() {
  console.log('Starting to seed clients...');

  // Define the clients to be created
  const clients = [
    {
      name: 'Acme Corporation',
      email: 'contact@acmecorp.com',
      phone: '+1-555-0101',
      company: 'Acme Corporation',
      address: '123 Business Ave, New York, NY 10001',
      notes: 'Large enterprise client with multiple ongoing projects',
      industry: 'Technology',
      membershipType: 'MEMBER',
      yearlyRevenue: 5000000.00
    },
    {
      name: 'TechStart Inc',
      email: 'hello@techstart.com',
      phone: '+1-555-0102',
      company: 'TechStart Inc',
      address: '456 Innovation St, San Francisco, CA 94105',
      notes: 'Startup company focused on AI and machine learning',
      industry: 'Technology',
      membershipType: 'NON_MEMBER',
      yearlyRevenue: 500000.00
    },
    {
      name: 'Global Manufacturing Ltd',
      email: 'info@globalmfg.com',
      phone: '+1-555-0103',
      company: 'Global Manufacturing Ltd',
      address: '789 Industrial Blvd, Detroit, MI 48201',
      notes: 'Manufacturing company with international operations',
      industry: 'Manufacturing',
      membershipType: 'MEMBER',
      yearlyRevenue: 15000000.00
    },
    {
      name: 'Creative Agency Co',
      email: 'team@creativeagency.com',
      phone: '+1-555-0104',
      company: 'Creative Agency Co',
      address: '321 Design District, Los Angeles, CA 90210',
      notes: 'Creative agency specializing in digital marketing',
      industry: 'Marketing',
      membershipType: 'NON_MEMBER',
      yearlyRevenue: 2000000.00
    },
    {
      name: 'Healthcare Solutions',
      email: 'contact@healthcaresolutions.com',
      phone: '+1-555-0105',
      company: 'Healthcare Solutions',
      address: '654 Medical Center Dr, Boston, MA 02115',
      notes: 'Healthcare technology company with HIPAA compliance requirements',
      industry: 'Healthcare',
      membershipType: 'MEMBER',
      yearlyRevenue: 8000000.00
    },
    {
      name: 'Retail Chain Corp',
      email: 'business@retailchain.com',
      phone: '+1-555-0106',
      company: 'Retail Chain Corp',
      address: '987 Commerce St, Chicago, IL 60601',
      notes: 'National retail chain with 500+ locations',
      industry: 'Retail',
      membershipType: 'MEMBER',
      yearlyRevenue: 25000000.00
    },
    {
      name: 'Green Energy Co',
      email: 'info@greenenergy.com',
      phone: '+1-555-0107',
      company: 'Green Energy Co',
      address: '147 Renewable Way, Austin, TX 78701',
      notes: 'Renewable energy company focused on solar and wind',
      industry: 'Energy',
      membershipType: 'NON_MEMBER',
      yearlyRevenue: 3000000.00
    },
    {
      name: 'Financial Services Group',
      email: 'contact@financialgroup.com',
      phone: '+1-555-0108',
      company: 'Financial Services Group',
      address: '258 Wall Street, New York, NY 10005',
      notes: 'Investment banking and financial advisory services',
      industry: 'Finance',
      membershipType: 'MEMBER',
      yearlyRevenue: 50000000.00
    },
    {
      name: 'Education Tech',
      email: 'hello@edutech.com',
      phone: '+1-555-0109',
      company: 'Education Tech',
      address: '369 Campus Blvd, Seattle, WA 98101',
      notes: 'Educational technology platform for online learning',
      industry: 'Education',
      membershipType: 'NON_MEMBER',
      yearlyRevenue: 1200000.00
    },
    {
      name: 'Logistics Pro',
      email: 'support@logisticspro.com',
      phone: '+1-555-0110',
      company: 'Logistics Pro',
      address: '741 Transport Ave, Miami, FL 33101',
      notes: 'International logistics and supply chain management',
      industry: 'Logistics',
      membershipType: 'MEMBER',
      yearlyRevenue: 12000000.00
    }
  ];

  // Optional: Clear existing clients (delete related records first due to foreign key constraints)
  await prisma.quotation.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  console.log('Cleared existing clients and related data');

  for (const client of clients) {
    try {
      await prisma.client.create({
        data: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          company: client.company,
          address: client.address,
          notes: client.notes,
          industry: client.industry,
          membershipType: client.membershipType,
          yearlyRevenue: client.yearlyRevenue,
        },
      });
      console.log(`Created client: "${client.name}"`);
    } catch (error: any) {
      console.error(`Error creating client "${client.name}": ${error.message}`);
    }
  }

  const count = await prisma.client.count();
  console.log(`✅ Seeded ${count} clients successfully`);
}

clientMain()
  .catch((e) => {
    console.error('Error seeding clients:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });