// ============ LOAD ENV FIRST ============
import dotenv from "dotenv";
dotenv.config();

// ============ IMPORTS ============
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel, MeetingRoomType } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import { UserModel, UserRole } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel, PropertyStatus, KYCStatus } from "../flashspaceWeb/propertyModule/property.model";
import { SpaceApprovalStatus } from "../flashspaceWeb/shared/enums/spaceApproval.enum";

const JSON_PATH = path.resolve(__dirname, "./parsed_data.json");
const CSV_PATH = path.resolve(__dirname, "../../../FlashSpace-web-client/src/excel/93141be7-8c47-441e-b3d6-4e5a698151be.csv");

const loadSeedData = () => {
  // 1. Check for manual JSON parsed data first (user edits this)
  if (fs.existsSync(JSON_PATH)) {
    console.log("📂 Found parsed_data.json. Using it for seeding...");
    const content = fs.readFileSync(JSON_PATH, "utf8");
    const data = JSON.parse(content);
    return {
      coworkingDataRaw: (data.coworkingData || []).filter((cw: any) => cw.name && cw.address && cw.city),
      virtualOfficeDataRaw: data.virtualOfficeData || []
    };
  }

  // 2. Fallback to raw CSV if JSON is missing
  if (!fs.existsSync(CSV_PATH)) {
    console.warn(`⚠️ Seed source not found. Using fallback data.`);
    return { coworkingDataRaw: [], virtualOfficeDataRaw: [] };
  }

  console.log("📄 Parsing original CSV...");
  const fileContent = fs.readFileSync(CSV_PATH, "utf8");
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const coworkingDataRaw: any[] = [];
  const virtualOfficeDataRaw: any[] = [];

  for (const row of records as any[]) {
    const name = row["Task Name"];
    const spaceId = row["SPACE ID (short text)"];
    const address = row["Address (short text)"];
    const cityLabel = row["Location (labels)"] || "";
    const city = cityLabel.replace(/[\[\]]/g, "").trim();

    if (!name || !city || city === "[]" || !address) {
      continue;
    }

    const cwPriceRaw = row["Coworking / Month (currency)"];
    const cwPrice = cwPriceRaw ? `₹${cwPriceRaw}/month` : "₹0/month";

    coworkingDataRaw.push({
      name,
      spaceId,
      address,
      city,
      price: cwPrice,
      originalPrice: cwPrice,
      rating: 4.5,
      reviews: 120,
      features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
      area: city,
      image: "",
      popular: false,
      type: "Hot Desk",
    });

    virtualOfficeDataRaw.push({
      name,
      gstPlanPrice: row["GST Plan - Pricing  (currency)"] ? `₹${row["GST Plan - Pricing  (currency)"]}/year` : "₹0/year",
      mailingPlanPrice: row["Mailing Plan - Pricing (currency)"] ? `₹${row["Mailing Plan - Pricing (currency)"]}/year` : "₹0/year",
      brPlanPrice: row["BR Plan - Pricing  (currency)"] ? `₹${row["BR Plan - Pricing  (currency)"]}/year` : "₹0/year",
    });
  }

  return { coworkingDataRaw, virtualOfficeDataRaw };
};

const { coworkingDataRaw, virtualOfficeDataRaw } = loadSeedData();

// ============ VALIDATE ENV ============
if (!process.env.DB_URI) {
  console.error("❌ DB_URI is missing in .env");
  process.exit(1);
}

const dbName = process.env.DB_NAME;

console.log("🚀 Starting unified property seed script...");

// ============ HELPER ============
const parsePrice = (priceStr: string | number): number => {
  if (typeof priceStr === "number") return priceStr;
  const cleaned = priceStr.replace(/[^\d]/g, "");
  return parseInt(cleaned) || 0;
};

// Provide a small default gallery so every property has multiple images
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?auto=format&fit=crop&w=1200&q=80",
];

// Cloudinary Images organized by Space Folders (provided list)
// Total: 278 images across all spaces
const spaceImages: Record<string, string[]> = {
  CoSpaces: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774464007/img19_gikw4q.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774464002/img16_izwawu.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774464001/img13_ucojml.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463998/img10_mzxazc.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463997/img4_pmqz4p.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463996/img7_sthn2a.jpg",
  ],
  RegisterKaro_Punjab: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463913/img20_d75wmy.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463910/img17_wy76zg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463909/img14_wxapjz.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463908/img11_b4gcfq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463906/img8_y1vkfy.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463905/img5_vhxusy.jpg",
  ],
  SanogicCoworking_Punjab: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463822/img26_alonil.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463821/img14_uzo1fn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463820/img13_rpq2ct.jpg",
  ],
  DivineCoworking_Pune: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463708/img61_gp4dtx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463706/img51_rzphpo.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463704/img50_kauksf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463704/img38_xfgwun.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463702/img37_qj7yl5.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463699/img29_dc8kqy.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463698/img17_cbmb0k.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463698/img16_xpox6e.jpg",
  ],
  OplusCowork_Patna: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463619/img34_jgp8cs.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463617/img26_pybcda.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463615/img25_egchrn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463615/img15_wiualw.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463614/img14_f7ofd9.jpg",
  ],
  WorkShalaSec3_Noida: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463483/img41_bojjwf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463481/img40_ipw3zd.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463480/img30_fwc5lc.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463479/img29_enep4n.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463478/img15_huylle.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463477/img14_hl9ji5.jpg",
  ],
  Sector63Crysta_Noida: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463335/img28_bjrbpa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463334/img14_qlq6ex.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463334/img13_jkcqty.jpg",
  ],
  SSSpaces_Mysuru: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463166/img19_awury1.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463164/img16_vj4ybh.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463162/img13_z4fgo8.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463162/img10_sgvy0e.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463161/img7_dwn5dr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463161/img4_fqincs.jpg",
  ],
  RegisterKaro_Mumbai: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463147/img31_oaze0n.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463146/img28_rumzlp.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463142/img13_mlnvky.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463146/img25_xnock6.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463145/img22_ywxrhu.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463142/img19_phgfin.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463140/img16_acy0ho.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463139/img10_nd71hx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463138/img7_cnm4af.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774463138/img4_kvz2vk.jpg",
  ],
  CynergX_MP: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462869/img25_xvwr9s.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462868/img22_huengg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462866/img19_zletty.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462865/img16_ergogf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462864/img13_rbgjke.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462864/img10_g4lqkx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462863/img7_wzdg3u.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462863/img4_u5p7cy.jpg",
  ],
  "365VirtualCoworkers_MP": [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462793/img31_jv0xot.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462792/img28_uehxci.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462792/img25_ah5czv.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462787/img22_vqwmgz.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462786/img19_vfea4u.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462785/img13_o8arry.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462785/img16_k4aaaa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462785/img10_yibqdr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462784/img7_p8nudr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462784/img4_fldhcy.jpg",
  ],
  ParkStreetEasyDaftar_Kolkata: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462510/img41_wzucnj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462509/img40_ziuy2z.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462509/img30_qedvq5.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462508/img15_nx6iwj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462509/img29_g1uoxf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462508/img14_gt9hqu.jpg",
  ],
  SaltLakeEasyDaftar_Kolkata: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462434/img13_p3oqge.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462434/img12_uf1jfz.jpg",
  ],
  ParkStreet_Kolkata: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462331/img36_d87ymi.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462331/img30_wha5od.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462330/img24_zb8jgw.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462330/img18_xan6pq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462330/img12_b0zqs0.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462329/img6_uh3jer.jpg",
  ],
  CamacStreet_Kolkata: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462238/img42_tpqfz2.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462237/img30_ywucqa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462237/img36_v7dvfp.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462237/img24_lpoefy.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462237/img18_clnqcn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462236/img12_hjffvr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774462236/img6_jj3auj.jpg",
  ],
  SpaceHive_Kochi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774460088/img27_pybgfy.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774460084/img26_saotcc.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774460080/img14_xdwvpu.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774460077/img13_z9q4rm.jpg",
  ],
  ApnaYtCoworkers_Jodhpur: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459978/img37_zcz8re.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459974/img36_vspcot.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459969/img28_eklnlp.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459966/img27_ynmryx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459961/img15_hrbjhs.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459959/img14_ix0lno.jpg",
  ],
  KaytechSolutions_JK: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459867/img27_gd73su.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459862/img26_udda3q.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459858/img14_rrdzcj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459856/img13_uhj6od.jpg",
  ],
  QuibickleCoworking_JK: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459738/img37_abyxx3.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459735/img36_rmag6u.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459731/img28_wqno3u.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459727/img27_vjhitp.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459723/img15_co4jw0.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459721/img14_ufky1e.jpg",
  ],
  JeevanBusiness_Jaipur: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459641/img27_jj1jjf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459638/img26_fo66le.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459635/img14_lqwngn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459631/img13_xzb2v6.jpg",
  ],
  CSCoworkingGachibowli_Hyderabad: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459570/img37_tgqquv.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459567/img36_wjcpce.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459563/img28_kkyzft.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459560/img27_oiyugc.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459557/img15_uew9hn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774459553/img14_uzcxu2.jpg",
  ],
  Ghumakkad_HP: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453718/img34_a78ipz.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453718/img15_lox4ji.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453717/img26_xlvotz.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453715/img25_cklov1.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453712/img14_kznnr8.jpg",
  ],
  TheWorLaunge_Gurgaon: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453594/img28_xovs6f.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453593/img16_d5gyl4.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453593/img22_rsbjel.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453593/img25_u0mjn3.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453590/img19_s6ytzt.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453586/img13_vateuc.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453585/img10_dzj8sq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453582/img7_wyfaxm.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453580/img4_eglw97.jpg",
  ],
  TeamCowork_Gurgaon: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453511/img24_n0slns.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453509/img18_ewcajj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453509/img6_qhdegn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453508/img12_shwang.jpg",
  ],
  InfrraPro_Gurgaon: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453438/img34_oe3qek.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453436/img31_jthlir.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453435/img28_joufy1.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453432/img25_boon9a.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453429/img22_yihyzf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453427/img19_ebzgxt.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453426/img16_zpn6zf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453424/img13_gldmhk.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453422/img10_j1k0fa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453421/img4_qu8fwb.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453420/img7_l9wrva.jpg",
  ],
  RegisterKaroCowork_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453190/img82_agwoun.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453186/img72_fnzfgr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453184/img77_v8tame.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453180/img67_s2vuvw.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453179/img57_fouvos.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453178/img62_yli6dz.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453174/img32_raesgy.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453172/img52_v4ozfj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453172/img37_qwsyxi.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453170/img47_jygfr1.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453169/img42_umxalb.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453166/img27_po8xzd.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453165/img17_x19rsa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453164/img22_zqaywa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453162/img12_pptiee.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453160/img7_skyury.jpg",
  ],
  SanogicCoworking_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453024/WhatsApp_Image_2025-11-12_at_12.29.47_PM_ay0vhj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453017/WhatsApp_Image_2025-11-12_at_12.29.46_PM_ayv0yg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453014/WhatsApp_Image_2025-11-12_at_12.29.45_PM_2_agfpx5.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453011/WhatsApp_Image_2025-11-12_at_12.29.45_PM_1_l6xvcs.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453010/WhatsApp_Image_2025-11-12_at_12.29.44_PM_1_hlhnrt.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453009/WhatsApp_Image_2025-11-12_at_12.29.44_PM_hrokpp.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453008/WhatsApp_Image_2025-11-12_at_12.29.43_PM_1_zn2bfa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774453007/WhatsApp_Image_2025-11-12_at_12.29.43_PM_zvrbom.jpg",
  ],
  GetSetSpaces_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452964/img25_rl8tej.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452964/img24_upxeqs.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452960/img14_siolkt.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452959/img13_ln5pnj.jpg",
  ],
  WorkBeyond_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452862/img32_kyhgs2.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452862/img42_ctnrqo.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452859/img31_qvlumi.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452859/img15_bu9yho.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452858/img14_cbvmkq.jpg",
  ],
  WBBOffice_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452717/img14_hhcfyq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452712/img24_gypol6.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452711/img13_ejeksn.jpg",
  ],
  MyTimeCowork_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452626/img25_imq4u1.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452623/img28_hhz6lg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452620/img22_eya70b.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452619/img19_ekhccq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452617/img16_yvpopb.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452617/img13_wvtlik.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452616/img10_koawjn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452615/img7_by8yos.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452615/img4_ovlchh.jpg",
  ],
  OkhlaAltF_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452603/img33_si3lij.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452602/img28_zc6b06.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452602/img22_afmrcw.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452601/img16_lh1czp.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452600/img6_tngtxr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452600/img11_mznmng.jpg",
  ],
  VisionCowork_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452369/img28_qxfy6e.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452368/img22_xy7rpg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452367/img16_fnw2xl.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452367/img11_sxhibg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452365/img6_pw1fsj.jpg",
  ],
  StirringMinds_Delhi: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452043/img16_qd2kvq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452030/img21_hkmuzh.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452029/img11_om2xym.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774452029/img6_ht71it.jpg",
  ],
  Chhattisgarh: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774451912/img14_pcjusb.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774451912/img13_u6ulxf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774451911/img33_eantmk.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774451911/img32_lmv2ml.jpg",
  ],
  WBB_Chennai: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380233/img35_wx7zaa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380230/img34_yiegts.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380228/img26_wa9in5.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380225/img25_in4fnx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380222/img15_ojsqxf.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380220/img14_sr8hsy.jpg",
  ],
  Senat_Chennai: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380211/img25_mwkdf6.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380209/img24_aawirn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380205/img14_mokfzo.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774380151/img13_tc1siq.jpg",
  ],
  Workyard_Chandigarh: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379887/img38_zugycb.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379886/img26_d0xpfr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379883/img25_uejodm.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379881/img15_xtwitz.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379880/img14_kuuqpo.jpg",
  ],
  RegisterKaroOxford_Bangalore: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379684/img10_dneiop.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379681/img7_cmwwxq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379680/img4_xixkpj.jpg",
  ],
  LakshHebbal_Bangalore: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379602/img37_ojna05.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379600/img36_l7daaa.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379598/img28_qhyagw.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379596/img27_pm7b2l.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379594/img15_n7trhc.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379592/img14_ok1lez.jpg",
  ],
  EcospaceHebbal_Bangalore: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379577/img16_nozdkn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379575/img13_mew7qg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379573/img10_ruanwr.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379524/img7_bva5x7.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379522/img4_lecyad.jpg",
  ],
  Koramangala_Bangalore: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379497/img29_ynt0xs.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379495/img28_jd0jar.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379494/img14_uapnhg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379406/img13_mgcqip.jpg",
  ],
  IndiraNagar_Bangalore: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379328/img34_qlkhgg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379326/img31_iossz7.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379323/img28_iuh2rn.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379322/img25_v5r3nh.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379320/img22_txpied.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379319/img19_hor7v6.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379317/img16_it9szx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379316/img13_tutgi6.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379314/img10_az2lzg.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379313/img7_kz36yi.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379312/img4_nd4mcj.jpg",
  ],
  Gujarat_Ahmedabad: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379081/img34_u8ymi0.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379079/img31_xfmyq0.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379077/img28_cdy30s.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379076/img25_d3umjx.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379075/img22_ut2cmt.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379073/img19_fe6ocj.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379072/img16_mjgbfd.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379071/img13_ylh48k.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379070/img10_yl4son.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379069/img7_dk5dev.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774379068/img4_l18ekj.jpg",
  ],
  SweetSpot_Ahmedabad: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378831/img31_sxytng.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378830/img30_guos0s.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378829/img14_lxxsvi.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378828/img13_uwrtad.jpg",
  ],
  Makarba_Ahmedabad: [
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378619/img10_uycgaq.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378619/img13_jo6rim.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378618/img4_ingho5.jpg",
    "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378618/img7_nirtqb.jpg",
  ],
};

const IMAGE_KEY_MAP: Record<string, string> = {
  "Workzone - Ahmedabad|Ahmedabad": "Makarba_Ahmedabad",
  "Sweet Spot Spaces|Ahmedabad": "SweetSpot_Ahmedabad",
  "IndiraNagar - Aspire Coworks|Bangalore": "IndiraNagar_Bangalore",
  "Koramangala - Aspire Coworks|Bangalore": "Koramangala_Bangalore",
  "EcoSpace - Hebbal|Bangalore": "EcospaceHebbal_Bangalore",
  "EcoSpace - Hebbal, HMT Layout|Bangalore": "EcospaceHebbal_Bangalore",
  "Laksh Space - Hebbal, HMT layout|Bangalore": "LakshHebbal_Bangalore",
  "RegisterKaro|Bangalore": "RegisterKaroOxford_Bangalore",
  "RegisterKaro|Ahmedabad": "Gujarat_Ahmedabad",
  "RegisterKaro|Delhi": "RegisterKaroCowork_Delhi",
  "WBB Office|Chennai": "WBB_Chennai",
  "Senate Space|Chennai": "Senat_Chennai",
  "Stirring Minds|Delhi": "StirringMinds_Delhi",
  "Mytime Cowork|Delhi": "MyTimeCowork_Delhi",
  "Okhla Alt F|Delhi": "OkhlaAltF_Delhi",
  "Work & Beyond|Delhi": "WorkBeyond_Delhi",
  "Getset Spaces|Delhi": "GetSetSpaces_Delhi",
  "Infrapro - Sector 44|Gurgaon": "InfrraPro_Gurgaon",
  "Infrapro - Sector 44|Gurugram": "InfrraPro_Gurgaon",
  "TEAM COWORK- Palm Court - Gurgaon|Gurgaon": "TeamCowork_Gurgaon",
  "Palm Court - Gurgaon|Gurgaon": "TeamCowork_Gurgaon",
  "The Work Lounge|Gurgaon": "TheWorLaunge_Gurgaon",
  "Vision Cowork|Delhi": "VisionCowork_Delhi",
  "Sanogic Coworking Space|Delhi": "SanogicCoworking_Delhi",
  "Sanogic Coworking|Delhi": "SanogicCoworking_Delhi",
  "WBB Office - Laxmi Nagar|Delhi": "WBBOffice_Delhi",
  "WBB Office|Delhi": "WBBOffice_Delhi",
  "CS Coworking - GachiBowli|Hyderabad": "CSCoworkingGachibowli_Hyderabad",
  "CS Coworking|Hyderabad": "CSCoworkingGachibowli_Hyderabad",
  "Jeev Business Solutions|Jaipur": "JeevanBusiness_Jaipur",
  "Qubicle Coworking|Jammu": "QuibickleCoworking_JK",
  "Kaytech Solutions|Jammu": "KaytechSolutions_JK",
  "Ghoomakkad|Dharamshala": "Ghumakkad_HP",
  "WorkYard CWS|Chandigarh": "Workyard_Chandigarh",
  "WorkYard Coworking, Zirakpur|Zikrapur": "Workyard_Chandigarh",
  "Spacehive|Kochi": "SpaceHive_Kochi",
  "Oplus Cowork|Patna": "OplusCowork_Patna",
  "Divine Coworking|Pune": "DivineCoworking_Pune",
  "CynergX|Bhopal": "CynergX_MP",
  "365Virtualcoworks|Bhopal": "365VirtualCoworkers_MP",
  "Sector 63, Noida - Crystaa|Noida": "Sector63Crysta_Noida",
  "Workshala- sector 3|Noida": "WorkShalaSec3_Noida",
  "Park Street - EasyDaftar|Kolkata": "ParkStreetEasyDaftar_Kolkata",
  "Park Street - Workzone|Kolkata": "ParkStreet_Kolkata",
  "Camac Street - WorkZone|Kolkata": "CamacStreet_Kolkata",
  "Salt Lake, Sec V - EasyDaftar|Kolkata": "SaltLakeEasyDaftar_Kolkata",
  "Near Victoria Memorial - WorkZone|Kolkata": "ParkStreet_Kolkata",
  "Salt Lake, Sec V - Workzone|Kolkata": "SaltLakeEasyDaftar_Kolkata",
  "Rashbehari - EasyDaftar|Kolkata": "ParkStreetEasyDaftar_Kolkata",
  "Louden Street - EasyDaftar|Kolkata": "ParkStreetEasyDaftar_Kolkata",
  "Gujarat_Ahmedabad|Ahmedabad": "Gujarat_Ahmedabad",
  "Makarba_Ahmedabad|Ahmedabad": "Makarba_Ahmedabad",
};

const resolveImagesForSpace = (name: string, city?: string): string[] => {
  const keyWithCity = `${name}|${city || ""}`;
  const mappedKey = IMAGE_KEY_MAP[keyWithCity] || IMAGE_KEY_MAP[name];
  if (mappedKey && spaceImages[mappedKey]?.length) {
    return spaceImages[mappedKey];
  }
  if (spaceImages[name]) return spaceImages[name];
  return [];
};

// Basic city centroid fallbacks so new spaces render on the map
// Coordinates are [lng, lat]
const CITY_COORDS: Record<string, [number, number]> = {
  Ahmedabad: [72.5714, 23.0225],
  Bangalore: [77.5946, 12.9716],
  Bengaluru: [77.5946, 12.9716],
  Chennai: [80.2707, 13.0827],
  Delhi: [77.2090, 28.6139],
  Gurugram: [77.0266, 28.4595],
  Gurgaon: [77.0266, 28.4595],
  Hyderabad: [78.4867, 17.3850],
  Jaipur: [75.7873, 26.9124],
  Jammu: [74.8723, 32.7266],
  Dharamshala: [76.3242, 32.2190],
  Chandigarh: [76.7794, 30.7333],
  Kochi: [76.2711, 9.9312],
  Jodhpur: [73.0243, 26.2389],
  Ranchi: [85.3096, 23.3441],
  Bhopal: [77.4126, 23.2599],
  Chhattisgarh: [82.0, 21.3],
  Kolkata: [88.3639, 22.5726],
  Patna: [85.1376, 25.5941],
  Pune: [73.8567, 18.5204],
  Noida: [77.3910, 28.5355],
  Mysuru: [76.6394, 12.2958],
  Indiranagar: [77.6408, 12.9784],
  Koramangala: [77.6266, 12.9338],
  Hebbal: [77.5920, 13.0350],
  Zirakpur: [76.8195, 30.6425],
  Chandigarh_Tribune: [76.85, 30.73],
};

const buildLocation = (cw: any) => {
  if (cw.location && Array.isArray(cw.location.coordinates)) return cw.location;
  const cityKey = cw.city?.trim();
  if (cityKey && CITY_COORDS[cityKey]) {
    const [lng, lat] = CITY_COORDS[cityKey];
    // Increased jitter to prevent markers from stacking and show them spread across the city area
    const jitterLng = (Math.random() - 0.5) * 0.2;
    const jitterLat = (Math.random() - 0.5) * 0.2;
    return { type: "Point", coordinates: [lng + jitterLng, lat + jitterLat] };
  }
  return undefined;
};

// Normalize main + gallery images for a property
const buildImages = (cw: any): string[] => {
  const gallery = [
    cw.image,
    ...(Array.isArray(cw.images) ? cw.images : []),
    ...(Array.isArray(cw.gallery) ? cw.gallery : []),
  ].filter(Boolean);

  if (gallery.length === 0) return FALLBACK_IMAGES;
  return Array.from(new Set(gallery)); // de-dup while preserving order
};

// ============ USERS ============
const testUsers = [
  {
    email: "test@example.com",
    fullName: "Test User",
    password: "Test@123",
    phoneNumber: "+91-9876543210",
    role: UserRole.USER,
    isEmailVerified: true,
    kycVerified: false,
  },
  {
    email: "admin@flashspace.co",
    fullName: "Admin User",
    password: "Admin@123",
    phoneNumber: "+91-9876543211",
    role: UserRole.ADMIN,
    isEmailVerified: true,
    kycVerified: true,
  },
  {
    email: "partner@example.com",
    fullName: "Partner User",
    password: "Partner@123",
    phoneNumber: "+91-9876543212",
    role: UserRole.PARTNER,
    isEmailVerified: true,
    kycVerified: true,
  },
];



// ============ SEED SCRIPT ============

async function seedDatabase() {
  try {
    console.log("📦 Connecting to Database...");
    const connectOpts: any = {};
    if (dbName) connectOpts.dbName = dbName;
    await mongoose.connect(process.env.DB_URI as string, connectOpts);
    console.log("✅ Connected.");

    console.log("\n🧹 Clearing Existing Data...");
    await UserModel.deleteMany({});
    await PropertyModel.deleteMany({});
    await CoworkingSpaceModel.deleteMany({});
    await VirtualOfficeModel.deleteMany({});
    await MeetingRoomModel.deleteMany({});
    await BookingModel.deleteMany({});

    // 1. Seed Users
    console.log("👤 Seeding Users...");
    const hashedUsers = await Promise.all(testUsers.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 12) })));
    const insertedUsers = await UserModel.insertMany(hashedUsers);
    const partnerUser = insertedUsers.find((u) => u.role === UserRole.PARTNER);
    const regularUser = insertedUsers.find((u) => u.email === "test@example.com");
    const adminUser = insertedUsers.find((u) => u.email === "admin@flashspace.co");

    // Unified Maps
    const coworkingMap: Record<string, any> = {};
    const voMap: Record<string, any> = {};
    const mrMap: Record<string, any> = {};

    // 2. Combine Data into Unified Properties
    console.log("🏙️ Seeding Unified Properties and Multiple Services...");
    for (const cw of coworkingDataRaw) {
      const propertyImages = buildImages(cw);
      const cloudImages = resolveImagesForSpace(cw.name, cw.city);
      const finalImages = cloudImages.length ? cloudImages : propertyImages;
      // a. Create Unique Property
      const property = await PropertyModel.create({
        name: cw.name, spaceId: cw.spaceId, address: cw.address, city: cw.city, area: cw.area, features: cw.features, images: finalImages,
        location: buildLocation(cw),
        partner: partnerUser?._id, status: PropertyStatus.ACTIVE, kycStatus: KYCStatus.APPROVED, isActive: true,
      });
      console.log(`✅ Created property: ${property.name} with spaceId: ${property.spaceId}`);

      // b. Add Coworking Service
      const finalPriceCW = parsePrice(cw.price);
      if (finalImages.length) {
        cw.image = finalImages[0];
        cw.images = finalImages;
      }
      coworkingMap[cw.name] = await CoworkingSpaceModel.create({
        property: property._id, partner: partnerUser?._id, capacity: 50, popular: cw.popular,
        partnerPricePerMonth: Math.round(finalPriceCW * 0.8), adminMarkupPerMonth: Math.round(finalPriceCW * 0.2), finalPricePerMonth: finalPriceCW,
        amenities: cw.features, avgRating: cw.rating, totalReviews: cw.reviews,
        operatingHours: { openTime: "09:00", closeTime: "18:00", daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
        isActive: true,
        approvalStatus: SpaceApprovalStatus.ACTIVE,
      });

      // c. Check for matching Virtual Office and add it to the same property
      const voData = virtualOfficeDataRaw.find(
        (v: any) => v.name === cw.name || v.name === cw.name + " VO",
      );
      if (voData) {
        const gst = parsePrice(voData.gstPlanPrice);
        const mailing = parsePrice(voData.mailingPlanPrice);
        const br = parsePrice(voData.brPlanPrice);

        voMap[cw.name] = await VirtualOfficeModel.create({
          property: property._id, partner: partnerUser?._id, popular: cw.popular,
          partnerGstPricePerYear: Math.round(gst * 0.8), adminMarkupGstPerYear: Math.round(gst * 0.2), finalGstPricePerYear: gst,
          partnerMailingPricePerYear: Math.round(mailing * 0.8), adminMarkupMailingPerYear: Math.round(mailing * 0.2), finalMailingPricePerYear: mailing,
          partnerBrPricePerYear: Math.round(br * 0.8), adminMarkupBrPerYear: Math.round(br * 0.2), finalBrPricePerYear: br,
          amenities: cw.features, avgRating: cw.rating, totalReviews: cw.reviews, isActive: true,
          approvalStatus: SpaceApprovalStatus.ACTIVE,
        });
      }

      // d. Add Meeting Room if listed in features
      if (cw.features.includes("Meeting Rooms")) {
        mrMap[cw.name] = await MeetingRoomModel.create({
          property: property._id, partner: partnerUser?._id, capacity: 10, type: MeetingRoomType.MEETING_ROOM,
          partnerPricePerHour: 400, adminMarkupPerHour: 100, finalPricePerHour: 500, amenities: ["Projector", "Whiteboard"],
          operatingHours: { openTime: "09:00", closeTime: "18:00", daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
          isActive: true,
          approvalStatus: SpaceApprovalStatus.ACTIVE,
        });
      }
    }

    // 4. Seed Bookings
    console.log("📋 Seeding Bookings...");
    const bookingsData = [
      {
        bookingNumber: "FS-BKG-001", user: regularUser?._id, type: "VirtualOffice", spaceId: voMap["Getset Spaces"]?._id,
        spaceSnapshot: { name: "Getset Spaces", address: "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India", city: "Delhi", area: "Green Park", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767849459/chrome_Bn0q3U4F3v_wx4jpa.png" },
        plan: { name: "Mailing Plan", price: 18727, originalPrice: 20808, discount: 2081, tenure: 24, tenureUnit: "months" },
        status: "active", partner: partnerUser?._id, kycStatus: "approved", startDate: new Date(), endDate: new Date()
      },
      {
        bookingNumber: "FS-BKG-002", user: adminUser?._id, type: "CoworkingSpace", spaceId: coworkingMap["Workzone - Ahmedabad"]?._id,
        spaceSnapshot: { name: "Workzone - Ahmedabad", address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India", city: "Ahmedabad", area: "Makarba", image: "https://shorturl.at/Fyr6o" },
        plan: { name: "Hot Desk", price: 1083, originalPrice: 1333, discount: 250, tenure: 1, tenureUnit: "months" },
        status: "active", partner: partnerUser?._id, kycStatus: "approved", startDate: new Date(), endDate: new Date()
      },
      {
        bookingNumber: "FS-BKG-003", user: regularUser?._id, type: "MeetingRoom", spaceId: mrMap["Mytime Cowork"]?._id,
        spaceSnapshot: { name: "Mytime Cowork", address: "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India", city: "Delhi", area: "Saket", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696150/chrome_F5QP1MGRA2_whrsth.png" },
        plan: { name: "Meeting Room - Day Pass", price: 2500, originalPrice: 3000, discount: 500, tenure: 1, tenureUnit: "day" },
        status: "pending_kyc", partner: partnerUser?._id, kycStatus: "pending", startDate: new Date(), endDate: new Date()
      }
    ];
    await BookingModel.insertMany(bookingsData);

    console.log("\n🎉 UNIFIED SEEDING COMPLETE!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}
seedDatabase();
