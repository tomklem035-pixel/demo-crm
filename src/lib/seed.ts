import type { PrismaClient } from "@prisma/client";

const companiesData = [
  { name: "Northwind Robotics", industry: "Manufacturing", website: "https://northwind-robotics.example.com", employees: 320, annualRevenue: 48_000_000, city: "Detroit", country: "USA" },
  { name: "Aurora Cloud Systems", industry: "Software", website: "https://auroracloud.example.com", employees: 1200, annualRevenue: 215_000_000, city: "Seattle", country: "USA" },
  { name: "Silverline Capital", industry: "Finance", website: "https://silverline.example.com", employees: 85, annualRevenue: 60_000_000, city: "London", country: "UK" },
  { name: "Polaris Biotech", industry: "Healthcare", website: "https://polarisbio.example.com", employees: 450, annualRevenue: 92_000_000, city: "Boston", country: "USA" },
  { name: "Helix Logistics", industry: "Logistics", website: "https://helixlogistics.example.com", employees: 2200, annualRevenue: 380_000_000, city: "Rotterdam", country: "Netherlands" },
  { name: "Maple & Co Retail", industry: "Retail", website: "https://mapleco.example.com", employees: 640, annualRevenue: 115_000_000, city: "Toronto", country: "Canada" },
  { name: "Orbit Energy", industry: "Energy", website: "https://orbitenergy.example.com", employees: 980, annualRevenue: 410_000_000, city: "Houston", country: "USA" },
  { name: "Lumen Education", industry: "Education", website: "https://lumenedu.example.com", employees: 130, annualRevenue: 18_500_000, city: "Berlin", country: "Germany" },
  { name: "Tidepool Media", industry: "Media", website: "https://tidepoolmedia.example.com", employees: 75, annualRevenue: 12_000_000, city: "Los Angeles", country: "USA" },
  { name: "Granite State Insurance", industry: "Insurance", website: "https://granitestate.example.com", employees: 540, annualRevenue: 145_000_000, city: "Manchester", country: "USA" },
  { name: "Cobalt AI Labs", industry: "Software", website: "https://cobaltai.example.com", employees: 60, annualRevenue: 9_000_000, city: "San Francisco", country: "USA" },
  { name: "Verdant Agritech", industry: "Agriculture", website: "https://verdantagri.example.com", employees: 220, annualRevenue: 34_000_000, city: "Des Moines", country: "USA" },
];

const firstNames = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan", "Mia", "Lucas", "Charlotte", "Jackson", "Amelia", "Aiden", "Harper", "Elijah", "Evelyn", "Benjamin", "Abigail", "James", "Ella", "Carter", "Scarlett", "Sebastian", "Grace", "Henry", "Chloe", "Owen"];
const lastNames = ["Carter", "Reyes", "Nakamura", "O'Brien", "Patel", "Andersen", "Müller", "Rossi", "Dubois", "Kowalski", "Singh", "Garcia", "Park", "Walker", "Bennett", "Hughes", "Morales", "Khan", "Fischer", "Lopez", "Foster", "Hayes", "Russell", "Brooks", "Sanders", "Price", "Bell", "Wood", "Cole", "Diaz"];
const titles = ["VP of Sales", "Head of Marketing", "CTO", "CEO", "Account Manager", "Procurement Lead", "Operations Director", "Customer Success Lead", "Finance Manager", "Product Manager", "Engineering Director", "Sales Development Rep", "IT Manager"];

const dealAdjectives = ["Annual", "Q1", "Q2", "Q3", "Q4", "Pilot", "Expansion", "Renewal", "Initial", "Strategic"];
const dealNouns = ["License", "Subscription", "Implementation", "Service Contract", "Platform Rollout", "Migration", "Add-on", "Support Plan"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number, daysForward = 0): Date {
  const now = Date.now();
  const min = now - daysBack * 24 * 60 * 60 * 1000;
  const max = now + daysForward * 24 * 60 * 60 * 1000;
  return new Date(min + Math.random() * (max - min));
}

export async function runSeed(prisma: PrismaClient) {
  await prisma.deal.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();

  const companies = await Promise.all(
    companiesData.map((c) => prisma.company.create({ data: c })),
  );

  const statuses = ["LEAD", "QUALIFIED", "CUSTOMER", "CHURNED"] as const;
  const usedEmails = new Set<string>();
  const contacts: Awaited<ReturnType<typeof prisma.contact.create>>[] = [];
  for (let i = 0; i < 60; i++) {
    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const company = pick(companies);
    const baseEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, "");
    let email = `${baseEmail}@${company.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
    let suffix = 1;
    while (usedEmails.has(email)) {
      email = `${baseEmail}${suffix}@${company.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
      suffix++;
    }
    usedEmails.add(email);

    const contact = await prisma.contact.create({
      data: {
        firstName,
        lastName,
        email,
        phone: `+1-${randomInt(200, 989)}-${randomInt(200, 989)}-${randomInt(1000, 9999)}`,
        title: pick(titles),
        status: pick(statuses),
        companyId: company.id,
        createdAt: randomDate(180),
      },
    });
    contacts.push(contact);
  }

  const stages = [
    "PROSPECTING",
    "QUALIFICATION",
    "PROPOSAL",
    "NEGOTIATION",
    "CLOSED_WON",
    "CLOSED_LOST",
  ] as const;
  for (let i = 0; i < 80; i++) {
    const company = pick(companies);
    const companyContacts = contacts.filter((c) => c.companyId === company.id);
    const contact = companyContacts.length ? pick(companyContacts) : pick(contacts);
    const stage = pick(stages);
    const isClosed = stage === "CLOSED_WON" || stage === "CLOSED_LOST";

    await prisma.deal.create({
      data: {
        title: `${pick(dealAdjectives)} ${pick(dealNouns)} - ${company.name}`,
        value: randomInt(5_000, 250_000),
        stage,
        companyId: company.id,
        contactId: contact.id,
        expectedCloseDate: isClosed ? null : randomDate(0, 90),
        closedAt: isClosed ? randomDate(120) : null,
        createdAt: randomDate(180),
      },
    });
  }

  return {
    companies: await prisma.company.count(),
    contacts: await prisma.contact.count(),
    deals: await prisma.deal.count(),
  };
}
