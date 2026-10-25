/** Built-in expense categories — individual & family. Users can add their own. */
export type ExpenseScope = "INDIVIDUAL" | "FAMILY" | "BOTH";

export type BuiltinCategory = {
  name: string;
  scope: ExpenseScope;
};

export const BUILTIN_EXPENSE_CATEGORIES: BuiltinCategory[] = [
  // Individual
  { name: "Food & groceries", scope: "BOTH" },
  { name: "Transport & fuel", scope: "BOTH" },
  { name: "Airtime & data", scope: "INDIVIDUAL" },
  { name: "Personal care", scope: "INDIVIDUAL" },
  { name: "Clothing", scope: "BOTH" },
  { name: "Health & medicine", scope: "BOTH" },
  { name: "Insurance", scope: "BOTH" },
  { name: "Education & courses", scope: "BOTH" },
  { name: "Entertainment", scope: "INDIVIDUAL" },
  { name: "Subscriptions", scope: "INDIVIDUAL" },
  { name: "Tithe & giving", scope: "BOTH" },
  { name: "Savings contribution", scope: "BOTH" },
  { name: "Debt payment", scope: "BOTH" },
  // Family / home
  { name: "Rent / housing", scope: "FAMILY" },
  { name: "Utilities (water, power)", scope: "FAMILY" },
  { name: "Household items", scope: "FAMILY" },
  { name: "School fees", scope: "FAMILY" },
  { name: "Childcare", scope: "FAMILY" },
  { name: "Family support", scope: "FAMILY" },
  { name: "Home maintenance", scope: "FAMILY" },
  { name: "Travel / holiday", scope: "FAMILY" },
  { name: "Other", scope: "BOTH" },
];

export const SAVINGS_PURPOSES = [
  { id: "EMERGENCY", label: "Emergency fund" },
  { id: "SCHOOL_FEES", label: "School / college fees" },
  { id: "RENT_DEPOSIT", label: "Rent / house deposit" },
  { id: "MEDICAL", label: "Medical fund" },
  { id: "BUSINESS", label: "Business capital" },
  { id: "INVESTMENT", label: "Investment" },
  { id: "WEDDING", label: "Wedding / celebration" },
  { id: "TRAVEL", label: "Travel" },
  { id: "GADGET", label: "Gadget / equipment" },
  { id: "RETIREMENT", label: "Retirement" },
  { id: "CUSTOM", label: "Custom purpose" },
] as const;

export type SavingsPurposeId = (typeof SAVINGS_PURPOSES)[number]["id"];
