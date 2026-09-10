# CISSP outline to primary-source standards map

_Generated 2026-09-04. Machine-readable companion: `standards-map.json` (same directory)._

This maps items in the ISC2 CISSP Detailed Content Outline (effective 2024-04-15) to the primary
standards that actually govern them, so a question explanation can carry a citation a reader can
follow to a page, and the study guide can name the source a fact comes from.

Every locator below was verified by grepping the extracted text in `/home/zabx/source/cyber`.
Nothing is cited from memory. Where a locator could not be verified against a held document, the
entry says so and is marked `partial` or `unmapped` rather than guessed.

## What was covered

- **248 entries** total: **62 of 62 task-level** outline items and **186 of 278 subtask-level** items.
- All 62 tasks are mapped. Subtasks were added wherever the held material supports a distinct,
  followable citation rather than a repeat of the parent task's.
- Domain 4 subtasks are deliberately thin. That is a finding, not an omission: the governing
  sources for network fundamentals (ISO/IEC 7498-1, the IETF RFC series, SP 800-52r2, SP 800-77r1)
  are none of them in the repo, and forcing those items onto SP 800-53 SC-7 would produce citations
  a reader cannot follow.

## Coverage by domain

| Domain | Weight | Entries | Tasks | Subtasks | mapped | partial | unmapped | high conf |
|---|---|---|---|---|---|---|---|---|
| 1. Security and Risk Management | 16% | 46 | 12/12 | 34/34 | 40 | 4 | 2 | 34 |
| 2. Asset Security | 10% | 22 | 6/6 | 16/16 | 22 | 0 | 0 | 20 |
| 3. Security Architecture and Engineering | 13% | 49 | 10/10 | 39/62 | 41 | 6 | 2 | 37 |
| 4. Communication and Network Security | 13% | 18 | 3/3 | 15/26 | 16 | 1 | 1 | 12 |
| 5. Identity and Access Management (IAM) | 13% | 26 | 6/6 | 20/29 | 25 | 1 | 0 | 22 |
| 6. Security Assessment and Testing | 12% | 19 | 5/5 | 14/27 | 19 | 0 | 0 | 18 |
| 7. Security Operations | 13% | 51 | 15/15 | 36/59 | 47 | 3 | 1 | 46 |
| 8. Software Development Security | 10% | 17 | 5/5 | 12/25 | 16 | 0 | 1 | 15 |
| **Total** | 100% | **248** | | | **226** | **15** | **7** | **204** |

`mapped` means a governing source was found and verified. `partial` means a real but incomplete
source was found and the gap is named. `unmapped` means the governing source is not in the repo and
no substitute was offered.

## Licensing split

| Class | Citations | What it means for a commercial product |
|---|---|---|
| `open` | 479 | US Government work - NIST, FIPS, CFR, FAR/DFARS, CISA. Public domain in the US; quote freely with attribution. |
| `licensed` | 10 | CIS and PCI. Held here, but restricted. See the caution below. |
| `link-only` | 10 | Governing source not in the repo. Name it and link; never substitute a NIST document and present it as equivalent. |

**The licensed material needs care.**

- **CIS Controls v8.1** are `Creative Commons Attribution-NonCommercial-NoDerivatives 4.0` -
  verified in the files themselves. `CATALOGUE.md` records CC BY-NC-SA, which is wrong in both
  halves that matter. NonCommercial rules out use in a paid product; NoDerivatives rules out
  adaptation even where NC is satisfied. For this product: **cite the control number, quote nothing.**
- **PCI DSS v4.0.1** is PCI SSC copyright, all rights reserved. Requirement numbers and titles are
  facts and may be cited. Requirement text should not be reproduced at length without a PCI SSC licence.
- **OWASP** is marked `open` above because it is freely redistributable, but it is CC BY-SA 4.0.
  Attribute it, and be aware ShareAlike attaches to derivative works. Paraphrase rather than lift.

This is a licensing flag, not a legal opinion. Someone should confirm before any CIS or PCI text
goes into a paid product.

## Traps found

These are places where the obvious citation is the wrong one. They are the most valuable part of
this pass and several of them contradict what `CATALOGUE.md` currently says.

### T01 (high) - CMMC is anchored to SP 800-171 Rev 2, which NIST itself has withdrawn

32 CFR 170.2 incorporates by reference 'SP 800-171, Revision 2, February 2020 (includes updates as of January 28, 2021)' and 'SP 800-171A, June 2018'. Verified verbatim in text/regulatory/CFR-32-part170-CMMC-Program.txt lines 62 and 64. Meanwhile the 800-171r2 and 800-171A copies on disk both carry a NIST withdrawal notice dated 2024-05-14 superseding them with r3 and Ar3. Both statements are true at once: NIST-withdrawn is not the same as legally superseded, because a regulation freezes the edition it incorporates. For any CMMC question the answer is Rev 2; for a general 'current NIST CUI guidance' question the answer is Rev 3.

_Affects outline items: 1.4.6, 2.6.3, 6.2.10, 7.4.1_

### T02 (high) - SP 800-61 Rev 2 is withdrawn, and Rev 3 does not restate the four-phase incident response lifecycle

800-61r2 was withdrawn 2025-04-03 (withdrawal block verified in text/nist/NIST.SP.800-61r2.txt). 800-61r3 restructured incident response around the six CSF 2.0 Functions and shows the old four-phase model only as Fig. 1, explicitly labelled as the previous version's model. The CISSP still tests Preparation / Detection and Analysis / Containment, Eradication and Recovery / Post-Incident Activity. That phrasing must be attributed to the withdrawn r2 or to the SP 800-53 IR-4 control text, never to r3.

_Affects outline items: 7.6, 7.6.1, 7.6.2, 7.6.3, 7.6.5, 7.6.7, 1.5, 7.1_

### T03 (high) - SP 800-88 Rev 1 is withdrawn - superseded by Rev 2 on 2025-09-26, and Rev 2 is not in the repo

Neither CATALOGUE.md nor GAPS.md records this. The withdrawal block in text/nist/NIST.SP.800-88r1-sanitization.txt names SP 800-88r2 (Ross/Pillitteri, 2025-09-26, doi 10.6028/NIST.SP.800-88r2). 800-88 is the primary citation for data remanence and destruction across outline items 2.4.6, 2.4.7 and 3.10.9. The Clear/Purge/Destroy taxonomy is very likely preserved in r2 but that cannot be verified from anything held here. Until r2 is obtained, cite 'NIST SP 800-88' without pinning a revision.

_Affects outline items: 2.4.6, 2.4.7, 3.10.9, 7.5.2_

### T04 (high) - The entire NIST IR 8286 series on disk is withdrawn, and none of the replacements is held

All five files carry withdrawal notices: IR 8286 -> 8286r1 (2025-12-18), 8286A -> 8286Ar1 (2025-12-18), 8286B -> 8286B-upd1 (2025-02-26), 8286C -> 8286C-upd1 (2024-03-06), 8286D -> 8286D-upd1 (2025-02-26). CATALOGUE.md lists the series as a current holding. This is the ERM/risk-register material behind outline items 1.9.2, 1.9.7 and 6.3.3. Cite the series by name with a note that the held edition is superseded, or avoid it.

_Affects outline items: 1.9.2, 1.9.7, 6.3.3_

### T05 (high) - CIS Controls are CC BY-NC-ND, not CC BY-NC-SA - and NC rules them out of a commercial study product

Verified in the CIS files themselves: 'Creative Commons Attribution-NonCommercial-No Derivatives 4.0 International'. CATALOGUE.md records CC BY-NC-SA 4.0. The difference matters twice over: NonCommercial forbids use in a paid product at all, and NoDerivatives forbids adaptation even where NC is satisfied. For Secure Path Digital's commercial CISSP material, CIS is cite-the-control-number-only - no quoting, no paraphrase-as-derivative.

_Affects outline items: 2.3, 4.2, 3.5.5, 7.2.8_

### T06 (high) - FIPS 199 defines three security objectives, not five pillars

FIPS 199 Section 3 quotes 44 U.S.C. 3542 for exactly three objectives, and its definition of integrity already includes 'ensuring information non-repudiation and authenticity'. The CISSP's five pillars (adding authenticity and non-repudiation as peers of C/I/A) is ISC2's framing, not FIPS 199's. Never cite FIPS 199 as the source of a five-pillar claim. Where the two are needed separately, AU-10 Non-repudiation and SC-23 Session Authenticity are the control-level citations.

_Affects outline items: 1.2, 1.2.1_

### T07 (medium) - The preventive/detective/corrective control taxonomy is not a NIST taxonomy

800-53r5 classifies controls by family and by implementation responsibility, never as preventive, detective, corrective, deterrent, directive or compensating (compensating controls do exist, but in 800-53B's tailoring guidance, not as a control class). Outline item 1.9.4 uses the functional taxonomy, and there is no source for it anywhere in the repo. Cite 800-53 for what a control is; attribute the functional taxonomy to CISSP-canon material.

_Affects outline items: 1.9.4_

### T08 (medium) - 800-84's exercise taxonomy is not the CISSP's five DR test types

SP 800-84 Chapters 3-6 give training sessions, tabletop exercises, functional exercises and tests. The CISSP tests read-through/tabletop, walkthrough, simulation, parallel and full interruption. Only 'tabletop' is common to both. Parallel and full-interruption testing correspond to 800-84 Chapter 6 tests and to 800-53 CP-4(4) Full Recovery and Reconstitution. Attribute the five-type list to CISSP-canon material, not to 800-84.

_Affects outline items: 7.12_

### T09 (medium) - Several controls the exam still names by their Rev 4 titles were renamed or withdrawn in Rev 5

Verified against mappings/raw/800-53r4-to-r5-comparison.xlsx. Renamed: SC-26 Honeypots -> Decoys; CA-3 System Interconnections -> Information Exchange; AT-2 Security Awareness Training -> Literacy Training and Awareness; AC-11 Session Lock -> Device Lock; PE-14 Temperature and Humidity Controls -> Environmental Controls; RA-5 Vulnerability Scanning -> Vulnerability Monitoring and Scanning; SA-8 Security Engineering Principles -> Security and Privacy Engineering Principles; SC-2 Application Partitioning -> Separation of System and User Functionality; PE-4 Access Control for Transmission Medium -> Access Control for Transmission; PS-7 Third-Party Personnel Security -> External Personnel Security; AU-2 Audit Events -> Event Logging. Withdrawn: SC-19 Voice over Internet Protocol (technology-specific), PE-7 Visitor Control (into PE-2/PE-3), CA-4 Security Certification (into CA-2), SA-12 Supply Chain Protection (moved to the SR family), SA-13 Trustworthiness (into SA-8), SA-14 Criticality Analysis (into RA-9), SC-9 Transmission Confidentiality (into SC-8), AT-5 Contacts with Security Groups (into PM-15), SA-6 Software Usage Restrictions (into CM-10/SI-7).

_Affects outline items: 7.7, 7.7.6, 4.3, 4.3.1, 4.3.4, 1.12, 3.9.5, 3.9.6, 6.2.1, 3.1, 7.14_

### T10 (medium) - FIPS 140-3 does not contain the Security Level 1-4 definitions

The FIPS 140-3 document on disk is about 2,500 words. It adopts ISO/IEC 19790:2012(E) for requirements and ISO/IEC 24759:2017(E) for test methods, with modifications listed in its sections 3.3 and 3.4. The four Security Levels are defined in ISO/IEC 19790, which is paywalled and not in the repo. Citing 'FIPS 140-3 Security Level 3' to the FIPS PDF is a citation a reader cannot follow.

_Affects outline items: 3.5.4, 3.6, 3.4_

### T11 (medium) - 800-53 Release 5.2.0 exists but is not in the PDF or the extracted text

Release 5.2.0 (2025-08-27, per EO 14306) adds SA-15 changes, a new SA-24 Design for Cyber Resiliency and SI-02(07) Root Cause Analysis. NIST did not reissue the r5 PDF; 5.2.0 ships only through CPRT and OSCAL. The OSCAL catalog under sources/oscal/ IS 5.2.0. So a citation to 'SP 800-53 Rev 5' resolved against the PDF will not find SA-24 or SI-2(7). Say 'Rev 5' for anything in the PDF and 'Release 5.2.0 (OSCAL)' for the three additions.

_Affects outline items: 3.1, 8.2, 7.8_

### T12 (medium) - 800-53 Rev 5 has no job-rotation control and no duress control

Verified by grep across the full r5 text. 'Job rotation' returns nothing anywhere in the open corpus. 'Duress' occurs exactly once, in the AC-2(6) Dynamic Privilege Management discussion about emergency conditions - not as a control. Outline items 7.4.4 (job rotation) and 7.15.4 (duress) therefore have no NIST citation and are recorded unmapped rather than mapped to a near-neighbour.

_Affects outline items: 7.4, 7.4.4, 7.15_

### T13 (medium) - Cryptography is the weakest-covered technical area in the library

Verified absent: SP 800-57 Part 1 Rev 5 (key management, cryptoperiods, key states), FIPS 197 (AES), FIPS 186-5 (digital signature standard), FIPS 180-4 / FIPS 202 (hashing), SP 800-56A/B/C (key establishment), and the FIPS 203/204/205 post-quantum standards. Outline items 3.6.1 through 3.6.4 are therefore mapped only to SC-12/SC-13/SC-17, which state the obligation but supply no algorithm guidance and no cryptoperiods. Do not invent durations.

_Affects outline items: 3.6, 3.6.1, 3.6.2, 3.6.3, 3.6.4_

### T14 (medium) - Domain 4 network fundamentals have no source in the repo at all

The OSI reference model is ISO/IEC 7498-1 (paywalled, absent). TCP/IP and every protocol the outline names are IETF RFCs, and no RFC is held. SP 800-52r2 (TLS), SP 800-77r1 (IPsec), SP 800-94 (IDPS), SP 800-92 (log management), SP 800-97 and SP 800-153 (wireless) are all verified absent. 800-53 SC-7 and SC-8 state requirements, not protocol mechanics. Outline items 4.1.1 through 4.1.8 are largely unmapped, and forcing them onto SC-7 would produce citations a reader cannot follow.

_Affects outline items: 4.1, 4.1.1, 4.1.3_

### T15 (low) - Product-category names in the outline are not control names

SIEM, SOAR, DLP, DRM, CASB, NAC, PAM, UEBA, SASE and IAST do not appear in SP 800-53 Rev 5. Each has a defensible functional mapping (AU-6(3)/(4) for SIEM, IR-4(1) for SOAR, AC-4 and SC-7(10) for DLP, IA-3 for NAC, AC-6(5)+AC-6(9) for PAM, AC-2(12)+SI-4(11) for UEBA, SC-44 Detonation Chambers for sandboxing, SC-26 Decoys for honeypots) but the mapping must be presented as functional equivalence, not as a name match. SASE and IAST have no defensible mapping at all and are recorded unmapped.

_Affects outline items: 2.6.4, 3.1.11, 4.2.3, 7.2.2, 7.2.3, 7.2.8, 7.4.3, 7.7.5, 8.2.9_

### T16 (low) - OWASP Top 10:2025 is not the 2021 list most study material uses

The repo holds the 2025 edition, verified file by file. A03 is now Software Supply Chain Failures and A10 is Mishandling of Exceptional Conditions; SSRF has been folded into A01 Broken Access Control. Any question written against the 2021 list will disagree with the repo. Also: the Top 10 is an awareness document by its own statement - ASVS 5.0 is the verification standard a secure-coding policy is built on.

_Affects outline items: 8.5, 8.4.2, 8.5.1, 8.5.2_

### T17 (low) - SP 800-161r1 on disk is superseded by an errata update

The file carries a withdrawal notice dated 2024-11-01 naming SP 800-161r1-upd1. An errata update does not renumber sections or controls, so the locators in this map still resolve, but the citation should read 'Rev 1 (upd 1)'. Likewise SP 800-172 on disk was withdrawn 2026-05-13 in favour of 800-172r3, though 32 CFR 170.2 still incorporates the Feb 2021 edition for CMMC Level 3 - the same NIST-withdrawn-but-legally-current pattern as T01.

_Affects outline items: 1.11, 1.11.1, 1.11.2, 8.4_

## Unmapped and partial items, and why

| Outline | Title | Status | Why |
|---|---|---|---|
| `1.1` | Understand, adhere to, and promote professional ethics | partial | ISC2 Code of Professional Ethics is the primary source and is link-only - ISC2 copyright, not in the cyber repo. |
| `1.1.1` | ISC2 Code of Professional Ethics | unmapped | ISC2 copyright, link-only. There is no public-domain equivalent, and no NIST substitute should be offered. |
| `1.4.2` | Licensing and Intellectual Property requirements | partial | Intellectual-property statute is the governing source and is not held. CM-10 covers only the software-licence compliance sliver. |
| `1.4.3` | Import/export controls | unmapped | EAR and ITAR are the governing sources and neither is in the cyber repo. The FAR/DFARS full texts held on disk are procurement clauses, not export-control regulation, and must not be substituted. |
| `1.5` | Understand requirements for investigation types (i.e., administrati... | partial | No held document enumerates investigation types by burden of proof. 800-86 absent. |
| `1.9.4` | Applicable types of controls (e.g., preventive, detection, corrective) | partial | Functional control taxonomy has no governing source in the repo. |
| `3.1.11` | Secure access service edge | unmapped | Verified by grep: neither 'SASE' nor 'Secure Access Service Edge' appears anywhere in the open extracted corpus. SASE is an analyst-firm category (Gartner, 2019) with no standards-body definition. Do not manufacture a NIST citation. The closest defensible n... |
| `3.2` | Understand the fundamental concepts of security models (e.g., Biba,... | partial | Formal security models are academic/DoD-legacy sources, none held. AC-25 and AC-3(3)/(4) are the mechanism analogues, not the models. |
| `3.5.5` | Operational Technology/industrial control systems (ICS) | partial | 800-82 absent; IEC 62443 paywalled and absent. |
| `3.5.10` | Containerization | unmapped | NIST SP 800-190 (Application Container Security Guide) is the governing source and is verified absent from the repo (zero hits, no file). CIS has Docker and Kubernetes Benchmarks under licensed/_text/cis/benchmarks, but those are CC BY-NC-ND configuration b... |
| `3.5.15` | Virtualized systems | partial | 800-125 absent. |
| `3.6.1` | Cryptographic life cycle (e.g., keys, algorithm selection) | partial | 800-57 Part 1 absent - the actual lifecycle and cryptoperiod source. |
| `3.6.2` | Cryptographic methods (e.g., symmetric, asymmetric, elliptic curves... | partial | Algorithm standards absent from the repo. |
| `3.7` | Understand methods of cryptanalytic attacks | partial | No held standard defines the classical cryptanalytic attack taxonomy. MITRE covers the operational half only, and only as unextracted source data. |
| `4.1.1` | Open System Interconnection (OSI) and Transmission Control Protocol... | unmapped | The OSI reference model is ISO/IEC 7498-1:1994 (paywalled, not in the repo). The TCP/IP model and its protocols are IETF RFCs (RFC 1122/1123 host requirements, RFC 791/793 IP and TCP), and no RFC is held in the repo. There is no NIST document that defines e... |
| `4.1.3` | Secure protocols (e.g., Internet Protocol Security (IPSec), Secure ... | partial | 800-52r2 and 800-77r1 absent - no held source states TLS or IPsec configuration requirements. |
| `5.4.2` | Rule based access control | partial | No held document defines rule-based access control by name. |
| `7.1` | Understand and comply with investigations | partial | 800-86 absent - the forensics-specific source. The controls cited cover evidence protection, not forensic technique. |
| `7.4.4` | Job rotation | unmapped | Verified by grep: no job-rotation control exists in NIST SP 800-53 Rev 5, and the phrase does not appear in the open extracted corpus. Job rotation and mandatory vacation are traditional fraud-detection practices from audit and banking regulation, not from ... |
| `7.7.8` | Machine learning and artificial intelligence (AI) based tools | partial | No held source treats AI/ML-based security tooling directly. |
| `7.15` | Address personnel safety and security concerns | partial | No held document covers duress signalling, travel security or emergency management for personnel. |
| `8.1.2` | Maturity models (e.g., Capability Maturity Model (CMM), Software As... | unmapped | CMM/CMMI is ISACA-owned and not in the repo. OWASP SAMM is free but is not held in the repo either (only the Top 10 and ASVS are). BSIMM is referenced by 800-218 as an informative reference but the BSIMM document itself is not held. Cite the maturity models... |

## Documents absent from the library that would close real gaps

Ordered roughly by how much CISSP surface they would unlock.

| Document | Why it matters | Status |
|---|---|---|
| ISO/IEC 27001:2022, 27002:2022, 27005:2022 | The certifiable ISMS standard and its control set. Governing source for outline 1.3.4 and 1.9.9. | link-only, paywalled |
| AICPA Trust Services Criteria (TSP section 100) | SOC 2 audit criteria. Governing source for outline 6.5. | link-only; the file catalogued as held was an HTML landing page and was removed 2026-09-02 |
| ISC2 Code of Professional Ethics | The only source for outline 1.1.1. | link-only, ISC2 copyright |
| NIST SP 800-57 Part 1 Rev 5 | Key management, key states and cryptoperiods. Governing source for 3.6.1 and 3.6.4. | absent |
| NIST SP 800-60 Vol 1/2 Rev 1 | Mapping information types to FIPS 199 categories. Companion to 2.1. | absent |
| NIST SP 800-86 | Forensic technique, order of volatility, chain of custody. Governing source for 7.1 and 1.5. | absent |
| NIST SP 800-92 | Log management. Supports 7.2.6 and 6.2.3. | absent |
| NIST SP 800-94 | IDPS. Governing source for 7.2.1 and 7.7.2. | absent |
| NIST SP 800-82 | OT/ICS security. Governing source for 3.5.5. | absent |
| NIST SP 800-190 | Container security. Governing source for 3.5.10. | absent |
| NIST SP 800-145 and SP 800-210 | Cloud service-model definitions and cloud access control. Supports 3.5.6 and 8.4.5. | absent |
| NIST SP 800-125 | Virtualization security. Governing source for 3.5.15. | absent |
| NIST SP 800-52r2 and SP 800-77r1 | TLS and IPsec configuration. Governing sources for 4.1.3. | absent |
| NIST SP 800-50 / 800-50r1 | Awareness and training programme design. Supports 1.12. | absent |
| NIST SP 800-154 | Data-centric threat modelling. Governing source for 1.10 and 3.1.1. | absent |
| NIST SP 800-216 | Federal vulnerability disclosure guidelines. Supports 6.4.3. | absent |
| FIPS 197, FIPS 186-5, FIPS 180-4, FIPS 202, FIPS 203/204/205, SP 800-56A/B/C | Algorithm standards. Governing sources for 3.6.2. | absent |
| ISO/IEC 19790:2012 | The cryptographic-module Security Levels that FIPS 140-3 adopts by reference. Needed for 3.5.4. | link-only, paywalled |
| ISO/IEC 7498-1 and the IETF RFC series | OSI and TCP/IP reference models. Governing sources for 4.1.1 and much of 4.1. | link-only / absent |
| IEC 62443 | Industrial automation and control system security. Alternative source for 3.5.5. | link-only, paywalled |
| Bell-LaPadula, Biba, Clark-Wilson, Brewer-Nash papers; DoD 5200.28-STD | Formal security models. Governing sources for 3.2. | absent |
| EAR (15 CFR 730-774) and ITAR (22 CFR 120-130) | Export controls. Governing sources for 1.4.3. | absent |
| CCPA/CPRA, PIPL, POPIA | Privacy statutes named in outline 1.4.5. Only GDPR is held. | absent |
| NIST AI 100-1 (AI RMF) | AI risk. Supports 7.7.8 and 1.12.2. | absent |
| OWASP SAMM, BSIMM, CMMI | Maturity models named in outline 8.1.2. | absent / link-only |
| MITRE ATT&CK, CWE, CAPEC | Attack and weakness taxonomies. Support 3.7, 1.10, 8.3.2, 8.5.1. | on disk under sources/mitre as STIX JSON and XML, but NOT extracted to text/ - IDs are citable, descriptions need an extraction pass |
| OWASP ASVS 5.0 | The verification standard behind secure-coding policy. Supports 8.5. | held under sources/owasp but not extracted to text/ |

## Documents cited, by weight

| Document | Licensing | Citations |
|---|---|---|
| NIST SP 800-53 Rev 5 | `open` | 234 |
| NIST SP 800-218 | `open` | 23 |
| NIST SP 800-160 Vol 1 Rev 1 | `open` | 20 |
| NIST CSWP 29 (Cybersecurity Framework 2.0) | `open` | 18 |
| NIST SP 800-37 Rev 2 | `open` | 17 |
| NIST SP 800-34 Rev 1 | `open` | 14 |
| OWASP Top 10:2025 | `open` | 12 |
| EU GDPR (Regulation (EU) 2016/679) | `open` | 11 |
| 45 CFR Part 164 (HIPAA Security, Breach Notification, Privacy) | `open` | 10 |
| NIST SP 800-161 Rev 1 | `open` | 9 |
| NIST SP 800-61 Rev 3 | `open` | 9 |
| NIST SP 800-115 | `open` | 8 |
| PCI DSS v4.0.1 | `licensed` | 7 |
| NIST SP 800-207 | `open` | 7 |
| FIPS 199 | `open` | 6 |
| NIST SP 800-137 | `open` | 6 |
| NIST SP 800-30 Rev 1 | `open` | 5 |
| NIST SP 800-40 Rev 4 | `open` | 5 |
| NIST SP 800-53B | `open` | 5 |
| NIST SP 800-63C-4 | `open` | 5 |
| FIPS 200 | `open` | 4 |
| CISA Zero Trust Maturity Model | `open` | 4 |
| NIST SP 800-63B-4 | `open` | 4 |
| NIST SP 800-39 | `open` | 3 |
| 32 CFR Part 170 (CMMC Program final rule) | `open` | 3 |
| MITRE ATT&CK Enterprise (STIX 2.1) | `open` | 3 |
| CIS Critical Security Controls | `licensed` | 3 |
| NIST SP 800-88 Rev 1 | `open` | 3 |
| FIPS 140-3 | `open` | 3 |
| ISC2 Code of Professional Ethics | `link-only` | 2 |
| ISACA COBIT 2019 | `link-only` | 2 |
| DFARS 252.204-7012 | `open` | 2 |
| NIST SP 800-53A Rev 5 | `open` | 2 |
| NIST SP 800-218A | `open` | 2 |
| CMMC Assessment Guide - Level 2 | `open` | 2 |
| NIST SP 800-128 | `open` | 2 |
| MITRE CWE | `open` | 2 |
| OWASP Application Security Verification Standard | `open` | 2 |
| ISO/IEC 27001:2022 | `link-only` | 1 |
| SABSA | `link-only` | 1 |
| EAR - 15 CFR Parts 730-774 | `link-only` | 1 |
| ITAR - 22 CFR Parts 120-130 | `link-only` | 1 |
| DFARS 252.204-7021 | `open` | 1 |
| FAR 52.204-21 | `open` | 1 |
| NIST SP 800-18 Rev 1 | `open` | 1 |
| NIST IR 8286A | `open` | 1 |
| NIST IR 8286C | `open` | 1 |
| ISO/IEC 27005:2022 | `link-only` | 1 |
| MITRE CAPEC | `open` | 1 |
| CMMC Scoping Guide - Level 2 | `open` | 1 |
| NIST SP 800-63-4 | `open` | 1 |
| NIST SP 800-63A-4 | `open` | 1 |
| DoD NIST SP 800-171 Assessment Methodology | `open` | 1 |
| NIST IR 8286B | `open` | 1 |
| AICPA Trust Services Criteria (TSP section 100) | `link-only` | 1 |
| NIST SP 800-171 Rev 2 | `open` | 1 |
| NIST SP 800-160 Vol 2 Rev 1 | `open` | 1 |
| NIST SP 800-84 | `open` | 1 |

## How to use this with the bank

`standards-map.json` is keyed by `outline_id`, the same key the lesson spine and the question bank
use, so it joins directly. Each entry carries:

- `sources[]` with `doc_id`, `version`, `date`, `locator`, `says`, `licensing` and `text_path`
- `document_caveat` on any source whose held edition is withdrawn or superseded - **read these before quoting**
- `confidence` (high / medium / low) and, where relevant, `unmapped_reason`
- `notes`, which is where the item-level traps live

`text_path` points at the extracted plain text in `/home/zabx/source/cyber`, so a later pass can
pull an exact quotation without re-deriving the locator. Three source classes are exceptions:
MITRE ATT&CK/CWE/CAPEC point at STIX JSON and XML under `sources/mitre/` rather than extracted text,
OWASP ASVS points at `sources/owasp/` for the same reason, and `link-only` sources have no path at
all. Those four need an extraction pass before anything can be quoted from them.

Two rules for the enrichment pass that follows:

1. **A `document_caveat` beats the citation.** If a source is withdrawn, either cite the successor
   or cite the document without pinning a revision. Do not quietly cite a withdrawn edition.
2. **Never upgrade a `partial` or `unmapped` item into a confident citation.** Those entries name the
   document that would govern them. If it is not in the repo, the honest explanation says so.
