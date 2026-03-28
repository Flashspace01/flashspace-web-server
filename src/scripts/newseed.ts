// ============ LOAD ENV FIRST ============
import dotenv from "dotenv";
dotenv.config();

// ============ IMPORTS ============
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { CoworkingSpaceModel } from "../flashspaceWeb/coworkingSpaceModule/coworkingSpace.model";
import { VirtualOfficeModel } from "../flashspaceWeb/virtualOfficeModule/virtualOffice.model";
import { MeetingRoomModel, MeetingRoomType } from "../flashspaceWeb/meetingRoomModule/meetingRoom.model";
import { BookingModel } from "../flashspaceWeb/bookingModule/booking.model";
import { UserModel, UserRole } from "../flashspaceWeb/authModule/models/user.model";
import { PropertyModel, PropertyStatus, KYCStatus } from "../flashspaceWeb/propertyModule/property.model";

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
  "WorkYard Coworking, Zirakpur|Zirakpur": "Workyard_Chandigarh",
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
  Koramangala: [77.6266, 12.9352],
  Hebbal: [77.5920, 13.0350],
  Zirakpur: [76.8195, 30.6425],
  Chandigarh_Tribune: [76.85, 30.73],
};

const buildLocation = (cw: any) => {
  if (cw.location && Array.isArray(cw.location.coordinates)) return cw.location;
  const cityKey = cw.city?.trim();
  if (cityKey && CITY_COORDS[cityKey]) {
    const [lng, lat] = CITY_COORDS[cityKey];
    return { type: "Point", coordinates: [lng, lat] };
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

// ============ SOURCE DATA ============
const coworkingDataRaw = [
  {
    name: "Workzone - Ahmedabad",
    address: "World Trade Tower, Makarba, Ahmedabad, Gujarat 380051, India",
    city: "Ahmedabad",
    price: "₹1,083/year",
    originalPrice: "₹1,333",
    rating: 4.8,
    reviews: 245,
    features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"],
    area: "Makarba",
    image: "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378619/img10_uycgaq.jpg",
    images: [
      "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378619/img10_uycgaq.jpg",
      "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378618/ahm-workzone-lobby.jpg",
      "https://res.cloudinary.com/dawsxvwsw/image/upload/v1774378618/ahm-workzone-meeting.jpg",
    ],
    popular: true,
    type: "Hot Desk",
  },
  { name: "Sweet Spot Spaces", address: "Office No 4-D fourth, Vardaan Complex, Tower, Lakhudi Rd, near SARDAR PATEL STADIUM, Vithalbhai Patel Colony, Nathalal Colony, Navrangpura, Ahmedabad, Gujarat 380009, India", city: "Ahmedabad", price: "₹1,167/year", originalPrice: "₹1,417", rating: 4.7, reviews: 189, features: ["Premium Location", "Parking", "Event Space", "Cafeteria"], area: "Navrangpura", image: "https://shorturl.at/LdEgA", popular: false, type: "Dedicated Desk" },
  { name: "IndiraNagar - Aspire Coworks", address: "17, 7th Main Rd, Indira Nagar II Stage, Hoysala Nagar, Indiranagar, Bengaluru, Karnataka 560038, India", city: "Bangalore", price: "₹833/year", originalPrice: "₹1,083", rating: 4.8, reviews: 267, features: ["Tech Hub", "Innovation Labs", "Startup Ecosystem", "Outdoor Terrace"], area: "Indiranagar", image: "https://shorturl.at/LdEgA", popular: true, type: "Hot Desk" },
  { name: "Koramangala - Aspire Coworks", address: "2nd & 3rd Floor, Balaji Arcade, 472/7, 20th L Cross Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560095, India", city: "Bangalore", price: "₹1,000/year", originalPrice: "₹1,250", rating: 4.6, reviews: 189, features: ["IT Corridor", "Shuttle Service", "Gaming Area", "Wellness Programs"], area: "Koramangala", image: "https://shorturl.at/Fyr6o", popular: false, type: "Dedicated Desk" },
  { name: "EcoSpace - Hebbal", address: "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India", city: "Bangalore", price: "₹833/year", originalPrice: "₹1,083", rating: 4.5, reviews: 134, features: ["Residential Area", "Quiet Environment", "Flexible Hours", "Community Kitchen"], area: "HMT Layout", image: "https://shorturl.at/S4XWY", popular: false, type: "Hot Desk" },
  { name: "WBB Office", address: "Room no 1 No. 19, Metro Station, 35, Anna Salai, near Little Mount, Little Mount, Nandanam, Chennai, Tamil Nadu 600015, India", city: "Chennai", price: "₹4,800/year", originalPrice: "₹6,000", rating: 4.7, reviews: 198, features: ["Metro Connectivity", "Modern Facilities", "Parking", "Food Court"], area: "Nandanam", image: "https://shorturl.at/NUpzM", popular: true, type: "Hot Desk" },
  { name: "Senate Space", address: "W-126, 3rd Floor, 3rd Ave, Anna Nagar, Chennai, Tamil Nadu 600040, India", city: "Chennai", price: "₹917/year", originalPrice: "₹1,167", rating: 4.4, reviews: 112, features: ["Residential Area", "Peaceful Environment", "Basic Amenities", "WiFi"], area: "Anna Nagar", image: "https://shorturl.at/LdEgA", popular: false, type: "Dedicated Desk" },
  { name: "Stirring Minds", address: "Kundan Mansion, 2-A/3, Asaf Ali Rd, Turkman Gate, Chandni Chowk, New Delhi, Delhi, 110002, India", city: "Delhi", price: "₹800/year", originalPrice: "₹1,000", rating: 4.9, reviews: 245, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Chandni Chowk", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696478/chrome_y4ymlwh9SR_apwgug.png", popular: true, type: "Hot Desk" },
  { name: "CP Alt F", address: "J6JF+53C, Connaught Lane, Barakhamba, New Delhi, Delhi 110001, India", city: "Delhi", price: "₹2,667/year", originalPrice: "₹3,333", rating: 4.7, reviews: 189, features: ["Private Cabin Option", "Parking", "Event Space", "Cafeteria"], area: "Connaught Place", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696830/chrome_tF4p9FCNvN_e0w4dd.png", popular: true, type: "Dedicated Desk" },
  { name: "Virtualexcel", address: "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India", city: "Delhi", price: "₹1,000/year", originalPrice: "₹1,250", rating: 4.6, reviews: 156, features: ["Shopping Mall Access", "Premium Location", "Networking Events", "Printer Access"], area: "Saket", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696936/chrome_y6UfCoipUj_wkpxel.png", popular: false, type: "Hot Desk" },
  { name: "Mytime Cowork", address: "55 Lane-2, Westend Marg, Saiyad Ul Ajaib Village, Saket, New Delhi, Delhi 110030, India", city: "Delhi", price: "₹6,500/year", originalPrice: "₹8,000", rating: 4.8, reviews: 198, features: ["Premium Location", "Executive Lounge", "Concierge", "Valet Parking", "Meeting Rooms"], area: "Saket", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696150/chrome_F5QP1MGRA2_whrsth.png", popular: true, type: "Private Office" },
  { name: "Okhla Alt F", address: "101, NH-19, CRRI, Ishwar Nagar, Okhla, New Delhi, Delhi 110044, India", city: "Delhi", price: "₹2,500/year", originalPrice: "₹3,167", rating: 4.5, reviews: 134, features: ["Industrial Area", "Flexible Hours", "Gaming Zone", "Wellness Room"], area: "Okhla", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697088/chrome_nweqds48I9_i7xwhi.png", popular: false, type: "Hot Desk" },
  { name: "WBB Office - Laxmi Nagar", address: "Office no. 102, 52A first floor, Vijay Block, Block E, Laxmi Nagar, Delhi, 110092, India", city: "Delhi", price: "₹4,800/year", originalPrice: "₹6,000", rating: 4.3, reviews: 89, features: ["Budget Friendly", "Basic Amenities", "WiFi", "Print Access"], area: "Laxmi Nagar", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697269/chrome_e1S9bRUX5L_t3ltud.png", popular: false, type: "Shared Desk" },
  { name: "Budha Coworking Spaces", address: "3rd floor, H.no 33, Pocket 5, Sector-24, Rohini, Delhi, 110085, India", city: "Delhi", price: "₹4,200/year", originalPrice: "₹5,500", rating: 4.4, reviews: 112, features: ["Suburban Location", "Parking Available", "Community Events", "Cafeteria"], area: "Rohini", image: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", popular: false, type: "Hot Desk" },
  { name: "Work & Beyond", address: "E-518 first floor Kocchar plaza near Ramphal Chowk dwark sector 7, Block E, Palam Extension, Palam, Delhi, 110077, India", city: "Delhi", price: "₹5,500/year", originalPrice: "₹7,000", rating: 4.5, reviews: 145, features: ["Airport Proximity", "Modern Amenities", "Meeting Rooms", "Parking"], area: "Dwarka", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767697175/chrome_4eVI3pxb5I_qpev0q.png", popular: false, type: "Dedicated Desk" },
  { name: "Getset Spaces", address: "3rd Floor, LMR House, S-16, Block C, Green Park Extension, Green Park, New Delhi, Delhi 110016, India", city: "Delhi", price: "₹5,000/year", originalPrice: "₹6,500", rating: 4.6, reviews: 167, features: ["South Delhi", "Premium Facilities", "Networking", "Cafeteria"], area: "Green Park", image: "https://res.cloudinary.com/drd4942mc/image/upload/v1767696619/chrome_Usn5xZsDny_b59bwf.png", popular: true, type: "Private Office" },
  { name: "Infrapro - Sector 44", address: "Plot no 4, 2nd floor, Minarch Tower, Sector 44, Gurugram, Haryana 122003, India", city: "Gurgaon", price: "₹1,000/year", originalPrice: "₹1,250", rating: 4.7, reviews: 178, features: ["Corporate Hub", "Modern Facilities", "Ample Parking", "Food Court"], area: "Sector 44", image: "https://shorturl.at/Fyr6o", popular: true, type: "Dedicated Desk" },
  { name: "Palm Court - Gurgaon", address: "Mehrauli Rd, Gurugram, Haryana 122022, India", city: "Gurgaon", price: "₹1,000/year", originalPrice: "₹1,250", rating: 4.4, reviews: 134, features: ["Premium Location", "Creative Spaces", "Event Hosting", "Bike Parking"], area: "Mehrauli Road", image: "https://shorturl.at/Fyr6o", popular: false, type: "Hot Desk" },
  { name: "Ghoomakkad", address: "V.P.o, Sidhbari, Rakkar, Himachal Pradesh 176057, India", city: "Dharamshala", price: "₹667/year", originalPrice: "₹833", rating: 4.6, reviews: 156, features: ["Mountain View", "Peaceful Environment", "Nature Workspace", "Wellness Programs"], area: "Sidhbari", image: "https://shorturl.at/LdEgA", popular: false, type: "Dedicated Desk" },
  { name: "Cabins 24/7", address: "h, 5/86, Golden Tulip Estate, JV Hills, HITEC City, Kondapur, Telangana 500081, India", city: "Hyderabad", price: "₹1,000/year", originalPrice: "₹1,083", rating: 4.3, reviews: 98, features: ["IT Hub", "Flexible Plans", "Community Events", "Gaming Area"], area: "Kondapur", image: "https://shorturl.at/S4XWY", popular: false, type: "Hot Desk" },
  { name: "CS Coworking", address: "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India", city: "Hyderabad", price: "₹917/year", originalPrice: "₹1,167", rating: 4.5, reviews: 123, features: ["Tech Park", "Modern Infrastructure", "Parking", "Cafeteria"], area: "Gachibowli", image: "https://shorturl.at/NUpzM", popular: true, type: "Dedicated Desk" },
  { name: "Jeev Business Solutions", address: "548 1, Tonk Rd, behind Jaipur Hospital, Mahaveer Nagar, Gopal Pura Mode, Jaipur, Rajasthan 302018, India", city: "Jaipur", price: "₹833/year", originalPrice: "₹1,000", rating: 4.4, reviews: 145, features: ["Central Location", "Budget Friendly", "WiFi", "Meeting Rooms"], area: "Tonk Road", image: "https://shorturl.at/Fyr6o", popular: false, type: "Hot Desk" },
  { name: "Qubicle Coworking", address: "Trikuta Nagar Ext 1/A", city: "Jammu", price: "₹1,000/year", originalPrice: "₹1,250", rating: 4.5, reviews: 89, features: ["Residential Area", "Quiet Environment", "Basic Amenities", "WiFi"], area: "Trikuta Nagar", image: "https://shorturl.at/S4XWY", popular: false, type: "Hot Desk" },
  { name: "Kaytech Solutions", address: "Civil Airport, Satwari, Raipur Satwari, Jammu, Jammu and Kashmir 180003", city: "Jammu", price: "₹1,500/year", originalPrice: "₹1,833", rating: 4.6, reviews: 112, features: ["Airport Proximity", "Premium Amenities", "Parking", "Meeting Rooms"], area: "Satwari", image: "https://shorturl.at/NUpzM", popular: true, type: "Private Office" },
   { name: "Task Alley Rentals LLP", address: "2HV6+3MX, Maganbhai Barot Marg, Amrutbagh Colony, Sadhna Colony, Hindu Colony, Navrangpura, Ahmedabad, Gujarat 380009, India", city: "Ahmedabad", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Maganbhai Barot Marg", image: "", popular: false, type: "Hot Desk" },
  { name: "RegisterKaro", address: "Block-A, 606 Prahladnagar Trade Center, B/H Titanium City Center, Vejalpur, Ahmedabad, Gujarat, 380051", city: "Ahmedabad", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "606 Prahladnagar Trade Center", image: "", popular: false, type: "Hot Desk" },
  { name: "EcoSpace - Hebbal, HMT Layout", address: "No,33, 4th Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India", city: "Bangalore", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "33", image: "", popular: false, type: "Hot Desk" },
  { name: "Laksh Space - Hebbal, HMT layout", address: "No,33, 1st Floor, 1st Main, CBI Main Rd, HMT Layout, Ganganagar, Bengaluru, Karnataka 560032, India", city: "Bangalore", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "33", image: "", popular: false, type: "Hot Desk" },
  { name: "RegisterKaro", address: "Unit 101, Oxford Towers, No. 139 Old Airport Road, Bengaluru-560008", city: "Bangalore", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Oxford Towers", image: "", popular: false, type: "Hot Desk" },
  { name: "SIERRA CARTEL", address: "MG Road, Bangalore, Karnataka, India", city: "Bangalore", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Bangalore", image: "", popular: false, type: "Hot Desk" },
  { name: "WorkYard CWS", address: "Plot No 337, Phase, 2, Industrial Area Phase II, Chandigarh, 160002, India", city: "Chandigarh", price: "₹8000/year", originalPrice: "₹9600", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Phase", image: "", popular: false, type: "Hot Desk" },
  { name: "Qube Spaces", address: "QUBE, Dhruv Banerjee Pathlab, 97, TP Nagar Rd, in front of New Delhi Sweets, Indira Commercial Complex, Korba, Transport Nagar, Chhattisgarh 495677, India", city: "Chhattisgarh", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Dhruv Banerjee Pathlab", image: "", popular: false, type: "Hot Desk" },
  { name: "Vision Cowork", address: "Lower Ground Floor, Saket Salcon, Rasvilas, next to Select Citywalk Mall, Saket District Centre, District Centre, Sector 6, Pushp Vihar, Mal, New Delhi, Delhi 110017, India", city: "Delhi", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Saket Salcon", image: "", popular: false, type: "Hot Desk" },
  { name: "Sanogic Coworking Space", address: "Unit No. - 111, Aggarwal City Square, Plot No. 10, District Centre  Manglam Place, Sector-3, Rohini, New Delhi - 110085", city: "Delhi", price: "₹5500/year", originalPrice: "₹6600", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Aggarwal City Square", image: "", popular: false, type: "Hot Desk" },
  { name: "MSB Cospazes", address: "No.26-27-A, H- Block, Third Floor, (Office No.401 & 404) Vikas Marg, Laxmi Nagar, Delhi-110092,", city: "Delhi", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "H- Block", image: "", popular: false, type: "Hot Desk" },
  { name: "RegisterKaro", address: "808B, DLF Prime Tower, Pocket F, Okhla Phase I, Okhla Industrial Estate, New Delhi, Delhi 110020", city: "Delhi", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "DLF Prime Tower", image: "", popular: false, type: "Hot Desk" },
  { name: "TEAM COWORK- Palm Court - Gurgaon", address: "Mehrauli Rd, Gurugram, Haryana 122022, India", city: "Gurgaon", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Gurugram", image: "", popular: false, type: "Hot Desk" },
  { name: "MSB COspaze", address: "2nd Floor, Sona Marble Building, Sneh Vihar, Bhondsi, Gurgaon - 122102", city: "Gurgaon", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Sona Marble Building", image: "", popular: false, type: "Hot Desk" },
  { name: "The Work Lounge", address: "2nd floor, Welldone tech park, 213 14, Badshahpur Sohna Rd, Sector 48, Gurugram, Haryana 122018", city: "Gurgaon", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Welldone tech park", image: "", popular: false, type: "Hot Desk" },
  { name: "CS Coworking - GachiBowli", address: "Door No. 1-60, A & B, 3rd Floor, KNR Square, opp. The Platina, Gachibowli, Hyderabad, Telangana 500032, India", city: "Hyderabad", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "A & B", image: "", popular: false, type: "Hot Desk" },
  { name: "CS Coworking - Whitefield Kondapur", address: "Doc Bhavan, Hitech City Rd, Kondapur, Whitefields, Gachibowli, Hyderabad, Telangana 500084", city: "Hyderabad", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Hitech City Rd", image: "", popular: false, type: "Hot Desk" },
  { name: "CS Coworking.- Shaikpet I", address: "4th Floor, Aparna Astute Jubilee Hills, Shaikpet, Hyderabad, Telangana 500096", city: "Hyderabad", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Aparna Astute Jubilee Hills", image: "", popular: false, type: "Hot Desk" },
  { name: "CS Coworking - Hitex Road", address: "5th Floor, Melkiors Pride, Hitex Road, Vinayaka Nagar, Izzathnagar, HITEC City, Khanammet, Hyderabad, Telangana 500084", city: "Hyderabad", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Melkiors Pride", image: "", popular: false, type: "Hot Desk" },
  { name: "CS Coworking - Raidurg", address: "Cluster_malkajgiri 82, 19, Dargah Rd, LIG Chitrapuri Colony, Muppas Panchavati Colony, Radhe Nagar, Hyderabad, Rai Durg, Telangana 500104", city: "Hyderabad", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "19", image: "", popular: false, type: "Hot Desk" },
  { name: "Alt F - Gachibowli", address: "Divyasree Orion, Raidurg Panmaktha, Gachibowli, Hyderabad, Telangana 500032", city: "Hyderabad", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Raidurg Panmaktha", image: "", popular: false, type: "Hot Desk" },
  { name: "Namdhari Spaces- Ranchi", address: "4001, 4th floor, Skyline Complex, Kadru, Ranchi, Jharkhand 834002, India", city: "Jharkhand", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "4th floor", image: "", popular: false, type: "Hot Desk" },
  { name: "Apnayt Coworkers", address: "Apnayt Coworker J1-371 RIICO Sangaria, Industrial Area Phase, IInd, Jodhpur, Rajasthan 342013, India", city: "Jodhpur", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Industrial Area Phase", image: "", popular: false, type: "Hot Desk" },
  { name: "Spacehive", address: "4263, Anjikathu Rd, CSEZ, Chittethukara, Kakkanad, Kochi, Kerala 682037, India", city: "Kochi", price: "₹5500/year", originalPrice: "₹6600", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Anjikathu Rd", image: "", popular: false, type: "Hot Desk" },
  { name: "Kommon Spaces", address: "1st Floor, Sowbhagya building, Kollamkudimugal, Athani, Kochi, Kakkanad, Kerala 682030", city: "Kochi", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Sowbhagya building", image: "", popular: false, type: "Hot Desk" },
  { name: "Camac Street - WorkZone", address: "11th floor, Industry House, 10, Camac St, Elgin, Kolkata, West Bengal 700017, India", city: "Kolkata", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Industry House", image: "", popular: false, type: "Hot Desk" },
  { name: "Park Street - Workzone", address: "7th floor, Om Tower, 32, JL nehru road, Park St, Kolkata, West Bengal 700071, India", city: "Kolkata", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Om Tower", image: "", popular: false, type: "Hot Desk" },
  { name: "Near Victoria Memorial - WorkZone", address: "Circus Ave, Kolkata, West Bengal, India", city: "Kolkata", price: "₹6000/year", originalPrice: "₹7200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Kolkata", image: "", popular: false, type: "Hot Desk" },
  { name: "Salt Lake, Sec V - EasyDaftar", address: "CK 233, CK Block, Sector 2, Salt lake, Kolkata, West Bengal 700091", city: "Kolkata", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "CK Block", image: "", popular: false, type: "Hot Desk" },
  { name: "Salt Lake, Sec V - Workzone", address: "Block, D2, EP & GP, 2, GP Block, Sector V, Bidhannagar, Kolkata, West Bengal 700091, India", city: "Kolkata", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "D2", image: "", popular: false, type: "Hot Desk" },
  { name: "Park Street - EasyDaftar", address: "3 rd Floor, 75C, Park St, Taltala, Kolkata, West Bengal 700016, India", city: "Kolkata", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "75C", image: "", popular: false, type: "Hot Desk" },
  { name: "Rashbehari - EasyDaftar", address: "132A, Shyama Prasad Mukherjee Rd, Anami Sangha, Kalighat, Kolkata, West Bengal 700026, India", city: "Kolkata", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Shyama Prasad Mukherjee Rd", image: "", popular: false, type: "Hot Desk" },
  { name: "Louden Street - EasyDaftar", address: "8/1/2 Loudon Street, 3rd Floor. Surabhi Building, 8/1, Sir UN Brahmachari Sarani, Elgin, Kolkata, West Bengal 700017", city: "Kolkata", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "3rd Floor. Surabhi Building", image: "", popular: false, type: "Hot Desk" },
  { name: "KCAN COWORKING", address: "Park Street, Kolkata, West Bengal, India", city: "Kolkata", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Kolkata", image: "", popular: false, type: "Hot Desk" },
  { name: "365Virtualcoworks", address: "7th floor, Aaditya gateway, scheme B-704, MR 10 Rd, Sukhliya, Indore, Madhya Pradesh 452010", city: "Madhya Pradesh", price: "₹5000/year", originalPrice: "₹6000", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Aaditya gateway", image: "", popular: false, type: "Hot Desk" },
  { name: "CynergX", address: "E4, 271, E-4, Arera Colony, Bhopal, Madhya Pradesh 462016", city: "Madhya Pradesh", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "271", image: "", popular: false, type: "Hot Desk" },
  { name: "We Grow Coworks", address: "PLOT NO.- 88, 8th Floor, Proxima, Arunachal Bhavan, 19, Sector 30A, Vashi, Navi Mumbai, Maharashtra 400703, India", city: "Mumbai", price: "₹10000/year", originalPrice: "₹12000", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "8th Floor", image: "", popular: false, type: "Hot Desk" },
  { name: "RegisterKaro", address: "LODHA SIGNET 1 UNIT NO. 825 PREMIER COLONY GROUND KALYAN THANE Mangaon 421204", city: "Mumbai", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Mumbai", image: "", popular: false, type: "Hot Desk" },
  { name: "SS Spaces", address: "2 Maruthi complex, Maruthi temple circle, TK layout, Saraswathipuram, Mysuru, Karnataka 570009", city: "Mysuru", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Maruthi temple circle", image: "", popular: false, type: "Hot Desk" },
  { name: "Sector 63, Noida - Crystaa", address: "63m, Ivent, C-030, C Block, Sector 63, Noida, Hazratpur Wajidpur, Uttar Pradesh 201309, India", city: "Noida", price: "₹5500/year", originalPrice: "₹6600", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Ivent", image: "", popular: false, type: "Hot Desk" },
  { name: "Workshala- sector 3", address: "D-9, Vyapar Marg, Block D, Noida Sector 3, Noida, Uttar Pradesh 201301, India", city: "Noida", price: "₹6500/year", originalPrice: "₹7800", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Vyapar Marg", image: "", popular: false, type: "Hot Desk" },
  { name: "Sector 3 - MyWorX", address: "B-7, 1st floor, metro station, B-7, next to sector-15, B Block, Sector 2, Noida, Uttar Pradesh 201301, India", city: "Noida", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "1st floor", image: "", popular: false, type: "Hot Desk" },
  { name: "Sector 16 - Registerkaro", address: "OFFICE NO – 101, FIRST FLOOR, AT, SEVEN WONDER BUSINESS CENTER, PLOT NO. A-61, A Block, Sector 16, Noida, Uttar Pradesh 201301", city: "Noida", price: "₹0/year", originalPrice: "₹0", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "FIRST FLOOR", image: "", popular: false, type: "Hot Desk" },
  { name: "Sector 62 - Alt F", address: "C-20, 1/1A, Coast Guard Golf Ground Rd, C Block, Phase 2, Industrial Area, Sector 62, Noida, Uttar Pradesh 201309", city: "Noida", price: "₹7500/year", originalPrice: "₹9000", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "1/1A", image: "", popular: false, type: "Hot Desk" },
  { name: "Sec 142 - Alt F", address: "Ground Floor, Plot No. 21 & 21A, Sector 142, Noida, Uttar Pradesh 201304", city: "Noida", price: "₹5000/year", originalPrice: "₹6000", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Plot No. 21 & 21A", image: "", popular: false, type: "Hot Desk" },
  { name: "Sec 58 - Alt F", address: "A100, A Block, Sector 58, Noida, Uttar Pradesh 201309", city: "Noida", price: "₹8500/year", originalPrice: "₹10200", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "A Block", image: "", popular: false, type: "Hot Desk" },
  { name: "Sec 68 - Alt F", address: "A-5, Grovy Optiva, Block A, Sector 68, Noida, Basi Bahuddin Nagar, Uttar Pradesh 201316", city: "Noida", price: "₹7000/year", originalPrice: "₹8400", rating: 4.5, reviews: 120, features: ["High-Speed WiFi", "Meeting Rooms", "Coffee Bar", "24/7 Access"], area: "Grovy Optiva", image: "", popular: false, type: "Hot Desk" },
];

// New partner locations appended from VOS Locations sheet

 


// Additional VO pricing from VOS sheet for new locations

  


let virtualOfficeDataRaw = [
  { name: "Workzone - Ahmedabad", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹13000/year" },
  { name: "Sweet Spot Spaces", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹16000/year" },
  { name: "IndiraNagar - Aspire Coworks", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹10000/year" },
  { name: "Koramangala - Aspire Coworks", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹7000/year", brPlanPrice: "₹8000/year" },
  { name: "EcoSpace - Hebbal", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹10000/year" },
  { name: "WBB Office", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "Senate Space", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹14000/year" },
  { name: "Stirring Minds", gstPlanPrice: "₹9600/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "CP Alt F", gstPlanPrice: "₹32000/year", mailingPlanPrice: "₹18000/year", brPlanPrice: "₹32000/year" },
  { name: "Virtualexcel", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹12000/year", brPlanPrice: "₹14000/year" },
  { name: "Mytime Cowork", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹12000/year", brPlanPrice: "₹10000/year" },
  { name: "Okhla Alt F", gstPlanPrice: "₹30000/year", mailingPlanPrice: "₹15000/year", brPlanPrice: "₹32000/year" },
  { name: "WBB Office - Laxmi Nagar", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹14000/year" },
  { name: "Budha Coworking Spaces", gstPlanPrice: "₹917/year", mailingPlanPrice: "₹733/year", brPlanPrice: "₹1,083/year" },
  { name: "Work & Beyond", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹800/year", brPlanPrice: "₹12000/year" },
  { name: "Getset Spaces", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹10000/year" },
  { name: "Infrapro - Sector 44", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "Palm Court - Gurgaon", gstPlanPrice: "₹1,000/year", mailingPlanPrice: "₹750/year", brPlanPrice: "₹1,175/year" },
  { name: "Ghoomakkad", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹12000/year", brPlanPrice: "₹16000/year" },
  { name: "Cabins 24/7", gstPlanPrice: "₹1,000/year", mailingPlanPrice: "₹667/year", brPlanPrice: "₹1,175/year" },
  { name: "CS Coworking", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹13000/year" },
  { name: "Jeev Business Solutions", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "Qubicle Coworking", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹15000/year" },
  { name: "Task Alley Rentals LLP", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹15000/year" },
  { name: "RegisterKaro", gstPlanPrice: "₹11000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹12000/year" },
  { name: "EcoSpace - Hebbal, HMT Layout", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹10000/year" },
  { name: "Laksh Space - Hebbal, HMT layout", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹10000/year" },
  { name: "RegisterKaro", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹11000/year" },
  { name: "SIERRA CARTEL", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "WorkYard CWS", gstPlanPrice: "₹16000/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹18000/year" },
  { name: "Qube Spaces", gstPlanPrice: "₹16000/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹16000/year" },
  { name: "Vision Cowork", gstPlanPrice: "₹18000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹18000/year" },
  { name: "Sanogic Coworking Space", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹14000/year" },
  { name: "MSB Cospazes", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹10000/year" },
  { name: "RegisterKaro", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹11000/year" },
  { name: "TEAM COWORK- Palm Court - Gurgaon", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹12000/year" },
  { name: "MSB COspaze", gstPlanPrice: "₹9000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹9000/year" },
  { name: "The Work Lounge", gstPlanPrice: "₹5000/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "CS Coworking - GachiBowli", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹13000/year" },
  { name: "CS Coworking - Whitefield Kondapur", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹14000/year" },
  { name: "CS Coworking.- Shaikpet I", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹13000/year" },
  { name: "CS Coworking - Hitex Road", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹13000/year" },
  { name: "CS Coworking - Raidurg", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹13000/year" },
  { name: "Alt F - Gachibowli", gstPlanPrice: "₹25000/year", mailingPlanPrice: "₹15000/year", brPlanPrice: "₹30000/year" },
  { name: "Namdhari Spaces- Ranchi", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹0/year" },
  { name: "Apnayt Coworkers", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹0/year" },
  { name: "Spacehive", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹9000/year", brPlanPrice: "₹13000/year" },
  { name: "Kommon Spaces", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹13000/year" },
  { name: "Camac Street - WorkZone", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "Park Street - Workzone", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹13000/year" },
  { name: "Near Victoria Memorial - WorkZone", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹13000/year" },
  { name: "Salt Lake, Sec V - EasyDaftar", gstPlanPrice: "₹12500/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹14000/year" },
  { name: "Salt Lake, Sec V - Workzone", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹14000/year" },
  { name: "Park Street - EasyDaftar", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹14000/year" },
  { name: "Rashbehari - EasyDaftar", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹14000/year" },
  { name: "Louden Street - EasyDaftar", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹14000/year" },
  { name: "KCAN COWORKING", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "365Virtualcoworks", gstPlanPrice: "₹8000/year", mailingPlanPrice: "₹5999/year", brPlanPrice: "₹9000/year" },
  { name: "CynergX", gstPlanPrice: "₹15000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹12000/year" },
  { name: "We Grow Coworks", gstPlanPrice: "₹18000/year", mailingPlanPrice: "₹13000/year", brPlanPrice: "₹20000/year" },
  { name: "RegisterKaro", gstPlanPrice: "₹18000/year", mailingPlanPrice: "₹15000/year", brPlanPrice: "₹20000/year" },
  { name: "SS Spaces", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹12000/year", brPlanPrice: "₹16000/year" },
  { name: "Sector 63, Noida - Crystaa", gstPlanPrice: "₹10000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "Workshala- sector 3", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹14000/year" },
  { name: "Sector 3 - MyWorX", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹12000/year" },
  { name: "Sector 16 - Registerkaro", gstPlanPrice: "₹11000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹12000/year" },
  { name: "Sector 62 - Alt F", gstPlanPrice: "₹15000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹20000/year" },
  { name: "Sec 142 - Alt F", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹16000/year" },
  { name: "Sec 58 - Alt F", gstPlanPrice: "₹12000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹16000/year" },
  { name: "Sec 68 - Alt F", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "Oplus Cowork", gstPlanPrice: "₹18000/year", mailingPlanPrice: "₹12000/year", brPlanPrice: "₹20000/year" },
  { name: "Divine Coworking", gstPlanPrice: "₹18000/year", mailingPlanPrice: "₹14000/year", brPlanPrice: "₹18000/year" },
  { name: "Namdhari Spaces,zirakpur", gstPlanPrice: "₹14000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹0/year" },
  { name: "Sanogic Coworking,zirakpur", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "WorkYard Coworking, Zirakpur", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "RegisterKaro", gstPlanPrice: "₹13000/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹14000/year" },
  { name: "CoSpaces", gstPlanPrice: "₹16000/year", mailingPlanPrice: "₹10000/year", brPlanPrice: "₹16000/year" },
  { name: "HawkisH Coworking Space", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "RAINBOW COWORKING", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "Cabin 24/7", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "We work", gstPlanPrice: "₹0/year", mailingPlanPrice: "₹0/year", brPlanPrice: "₹0/year" },
  { name: "Kaytech Solutions", gstPlanPrice: "₹18000/year", mailingPlanPrice: "₹8000/year", brPlanPrice: "₹18000/year" },
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
    const hashedUsers = await Promise.all(testUsers.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 12)})));
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
        name: cw.name, address: cw.address, city: cw.city, area: cw.area, features: cw.features, images: finalImages,
        location: buildLocation(cw),
        partner: partnerUser?._id, status: PropertyStatus.ACTIVE, kycStatus: KYCStatus.APPROVED, isActive: true,
      });

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
      });

      // c. Check for matching Virtual Office and add it to the same property
      const voData = virtualOfficeDataRaw.find(v => v.name === cw.name || v.name === cw.name + " VO");
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
        });
      }

      // d. Add Meeting Room if listed in features
      if (cw.features.includes("Meeting Rooms")) {
        mrMap[cw.name] = await MeetingRoomModel.create({
          property: property._id, partner: partnerUser?._id, capacity: 10, type: MeetingRoomType.MEETING_ROOM,
          partnerPricePerHour: 400, adminMarkupPerHour: 100, finalPricePerHour: 500, amenities: ["Projector", "Whiteboard"],
          operatingHours: { openTime: "09:00", closeTime: "18:00", daysOpen: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
          isActive: true,
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
