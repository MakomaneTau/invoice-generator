import type { SellerProfile } from "./types";

export const SELLER_PROFILE: SellerProfile = {
  id: "real-is-rare",
  name: "Real Is Rare Apparel",
  addressLines: ["62A President Street, Germiston", "Gauteng", "1401"],
  phone: "061 180 7681",
  registrationNumber: "2021/692028/07",
  email: "realisrare122@gmail.com",
  payment: {
    method: "EFT",
    bank: "Capitec",
    accountHolder: "N.T Tau",
    accountType: "Savings",
    accountNumber: "1508083205",
    branchCode: "470010",
    reference: "Company name",
  },
};
