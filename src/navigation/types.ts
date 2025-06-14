export type BillItem = {
  id: string;
  name: string;
  amount: number;
  category: string;
};

export type DiscountType = 'percentage' | 'flat' | 'category';

export type Discount = {
  type: DiscountType;
  value: number;
  category?: string;
};

export type BillData = {
  items: BillItem[];
  subtotal: number;
  taxes: number;
  discounts: Discount[];
  tips: number;
  serviceCharges: number;
  grandTotal: number;
};

export type GroupMember = {
  id: string;
  name: string;
};

export type GroupData = {
  id?: string;
  name?: string;
  members: GroupMember[];
};

export type RootStackParamList = {
  BillReview: { imageUri: string; };
  Split: { billData: BillData; groupData: GroupData; }; 
  BillInput: undefined; 
  GroupSetup: undefined; 
  Home: undefined; 
  Welcome: undefined; 
  BillScanner: undefined; 
  History: undefined;
  Profile: undefined;
};

// This line is crucial for type inference throughout your app
// It tells React Navigation about your RootStackParamList
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}