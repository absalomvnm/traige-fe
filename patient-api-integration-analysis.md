# Patient Management API — Backend Integration Recommendations

> **Direction:** Backend changes required to match the UI's data capture model  
> **Service base URL:** `http://localhost:8081`  
> **Screens analysed:** TriageScreen (5 steps) · ResultScreen · PatientDetailsScreen · PatientsScreen · AlertsScreen

---

## 1. `POST /patients`

### Current accepted body
```json
{
  "name": "string",
  "surname": "string",
  "dob": "YYYY-MM-DD",
  "contact": "string"
}
```

### What the UI captures on Step 1 that has nowhere to go
| UI field | UI key | Example value | Suggested addition |
|---|---|---|---|
| Gestational age | `gestAge` | `38` (weeks) | `gestational_age_weeks: number` |
| Gravida | `gravida` | `"2"` | `gravida: number` |
| Para | `para` | `"1"` | `para: number` |

### Suggested request body
```json
{
  "name": "Nomsa",
  "surname": "Khumalo",
  "dob": "1995-04-12",
  "contact": "+27 81 674 3322",
  "gestational_age_weeks": 38,
  "gravida": 2,
  "para": 1
}
```

### Response — add `patientFileId`
The response must include a `patientFileId` so the UI can attach entries, notes, and assessments:
```json
{
  "id": 42,
  "patientFileId": 7,
  "name": "Nomsa",
  "surname": "Khumalo",
  "dob": "1995-04-12",
  "contact": "+27 81 674 3322",
  "gestational_age_weeks": 38,
  "gravida": 2,
  "para": 1,
  "createdAt": "2026-05-07T09:00:00Z"
}
```

---

## 2. `POST /patient-file-entries`

### Current accepted body
```json
{
  "patientFileId": "number",
  "recordedByUserId": "number",
  "category": "string",
  "fieldKey": "string",
  "fieldValue": "string"
}
```

### UI data that must map to this endpoint

The TriageScreen Step 2 captures a **Urinalysis** section not covered by any current endpoint.

**Suggested `category` values and their `fieldKey`/`fieldValue` pairs:**

#### Category: `obstetric_history`
| fieldKey | fieldValue type | Example |
|---|---|---|
| `gestational_age_weeks` | string (number) | `"38"` |
| `gravida` | string (number) | `"2"` |
| `para` | string (number) | `"1"` |

#### Category: `urinalysis` ← **does not exist yet in API**
| fieldKey | fieldValue options | Notes |
|---|---|---|
| `protein` | `"1+"` · `"2+"` · `"3+"` | Captured in TriageScreen Step 2 |
| `leukocytes` | `"1+"` · `"2+"` · `"3+"` | Captured in TriageScreen Step 2 |
| `haematuria` | `"1+"` · `"2+"` · `"3+"` | Captured in TriageScreen Step 2 |

#### Category: `risk_factors` ← **verify key names match UI**
The UI uses the following boolean risk factor keys. The API must accept these exact keys (or the UI code must be updated to match whatever keys the API defines — pick one and align):

| UI key (`fieldKey`) | Label shown in UI |
|---|---|
| `prev_cs` | Previous Caesarean Section |
| `chr_htn` | Chronic Hypertension |
| `diabetes` | Diabetes Mellitus (pre-existing) |
| `grand_multi` | Grand Multiparity (≥5 deliveries) |
| `adv_age` | Advanced Maternal Age (≥35 years) |
| `multi_preg` | Multiple Pregnancy (twins/triplets) |
| `rhesus` | Rhesus Incompatibility |
| `hiv` | HIV Positive |
| `anaemia` | Severe Anaemia (Hb <7 g/dL) |
| `prev_pph` | Previous Post-Partum Haemorrhage |

> **fieldValue** for all risk factors is `"true"` or `"false"` (string).

---

## 3. `POST /assessments`

This is the core endpoint. The UI generates all assessment data across Steps 2–5 but currently has no way to post it. Below is the exact body the UI needs to send.

### Current accepted body (from spec)
```json
{
  "patientId": "number",
  "userId": "number",
  "status": "string",
  "signsSymptoms": "JSON string",
  "vitals": "JSON string",
  "foetalMonitoring": "JSON string",
  "vaginalExam": "JSON string",
  "riskFactors": "JSON string"
}
```

### `signsSymptoms` — full key list needed

The UI captures 30 distinct condition codes via `condKeys[]` (Step 2 MultiConditionSelect). The `signsSymptoms` JSON object must accept all of these boolean flags plus a free-text overflow field:

```json
{
  "eclampsia": false,
  "imminent_eclampsia": false,
  "aph": false,
  "cord_prolapse": false,
  "loc": false,
  "mec3": false,
  "prev_csection_twice": false,
  "fresh_scar_labour": false,
  "absent_fetal_movement": false,
  "advanced_labour": false,
  "cephalopelvic": false,
  "sev_pec": false,
  "preterm": false,
  "pprom": false,
  "multi_labour": false,
  "sob": false,
  "msl_grade1_2": false,
  "plac_praevia": false,
  "pre_ec": false,
  "gest_htn": false,
  "gest_dm": false,
  "vbac": false,
  "grand_multi": false,
  "multigravida_latent": false,
  "post_dates": false,
  "false_labour": false,
  "uti": false,
  "nv": false,
  "mild_cx": false,
  "routine": false,
  "other_symptoms": "Free text for additional presenting complaints"
}
```

> The key `other_symptoms` (string) must be added to support the "Other symptoms" free-text input in Step 2.

---

### `vitals` — missing fields

Current assumed shape is `{ bp_systolic, bp_diastolic, heart_rate, respiration_rate }`.

The UI also captures SpO₂, temperature, and a clinical notes field. All must be added:

```json
{
  "bp_systolic": 120,
  "bp_diastolic": 80,
  "heart_rate": 88,
  "respiration_rate": 18,
  "spo2": 98,
  "temperature_celsius": 36.6,
  "notes": "Clinical notes about vital signs trends or additional observations"
}
```

| Missing key | UI field | Type | Example |
|---|---|---|---|
| `spo2` | `f.spo` | number | `98` |
| `temperature_celsius` | `f.temp` | number | `36.6` |
| `notes` | `f.vitalSignsNotes` | string | `"BP trending upward over 30 mins"` |

---

### `foetalMonitoring` — missing CTG notes field

```json
{
  "foetal_heart_rate": 145,
  "foetal_movement": "present",
  "ctg_notes": "Variable decelerations noted, good baseline variability"
}
```

| Missing key | UI field | Type | Notes |
|---|---|---|---|
| `ctg_notes` | `f.ctg` | string | Free-text CTG monitoring notes from Step 3 |

> `foetal_movement` must accept exactly three values: `"present"` · `"decreased"` · `"absent"`

---

### `vaginalExam` — missing examination notes field

```json
{
  "cervical_dilation": 5,
  "examination_notes": "Vertex presentation, station -1, no cord felt"
}
```

| Missing key | UI field | Type | Notes |
|---|---|---|---|
| `examination_notes` | `f.vagExamNotes` | string | Free-text vaginal examination notes from Step 4 |

> `cervical_dilation` should accept `-1` as "not examined" and `0` as "closed" — document this in schema.

---

### `riskFactors` — align key names with UI keys

The `riskFactors` JSON object must use the exact keys listed in Section 2 above. A confirmed example payload:

```json
{
  "prev_cs": false,
  "chr_htn": true,
  "diabetes": false,
  "grand_multi": false,
  "adv_age": true,
  "multi_preg": false,
  "rhesus": false,
  "hiv": false,
  "anaemia": true,
  "prev_pph": false
}
```

---

### `POST /assessments` — complete suggested request body

```json
{
  "patientId": 42,
  "userId": 3,
  "status": "in_progress",
  "signsSymptoms": {
    "eclampsia": false,
    "sev_pec": true,
    "sob": false,
    "other_symptoms": ""
  },
  "vitals": {
    "bp_systolic": 162,
    "bp_diastolic": 112,
    "heart_rate": 100,
    "respiration_rate": 20,
    "spo2": 97,
    "temperature_celsius": 37.1,
    "notes": "BP elevated consistently on repeat readings"
  },
  "foetalMonitoring": {
    "foetal_heart_rate": 148,
    "foetal_movement": "present",
    "ctg_notes": "Reactive trace, no decelerations"
  },
  "vaginalExam": {
    "cervical_dilation": 3,
    "examination_notes": "Vertex, engaged, no cord"
  },
  "riskFactors": {
    "prev_cs": false,
    "chr_htn": true,
    "diabetes": false,
    "grand_multi": false,
    "adv_age": false,
    "multi_preg": false,
    "rhesus": false,
    "hiv": false,
    "anaemia": false,
    "prev_pph": false
  }
}
```

---

### `POST /assessments` — response must include `assessmentId` + computed priority

```json
{
  "id": 101,
  "patientId": 42,
  "priority": 1,
  "status": "in_progress",
  "triggeredRules": [
    { "priority": 1, "text": "BP ≥160/110 — severe hypertension threshold" },
    { "priority": 1, "text": "Severe pre-eclampsia flags active" }
  ],
  "managementChecklist": [
    { "id": 301, "item": "CALL FOR HELP immediately — alert duty doctor and charge midwife", "completed": false },
    { "id": 302, "item": "Position patient left lateral; protect airway", "completed": false }
  ],
  "alerts": [
    { "id": 201, "type": "priority_1_triage", "priority": 1, "acknowledged": false }
  ],
  "createdAt": "2026-05-07T09:15:00Z"
}
```

The `managementChecklist` items returned in the response **must correspond to the priority** computed by the rule engine. The exact item text must be pre-seeded on the backend to match what the UI currently displays (see Appendix A for full MGMT text per priority level).

---

## 4. `POST /assessments/evaluate` (dry-run)

Same request shape as `POST /assessments`. No changes to request body beyond what is listed in Section 3.

Response must include:
```json
{
  "priority": 1,
  "triggeredRules": [],
  "riskHits": ["chr_htn", "anaemia"],
  "missingInputs": ["temperature_celsius"],
  "shiftHints": ["Consider MgSO₄ prophylaxis given risk profile"]
}
```

| Missing key | Purpose |
|---|---|
| `riskHits` | Risk factor keys that contributed to priority — drives the UI's "Decision Explanation" component |
| `missingInputs` | Fields not filled in — drives the UI's "Missing Inputs" section |
| `shiftHints` | Plain-language shift management hints for handover — displayed in the UI's decision summary block |

---

## 5. Real-time Section Endpoints

These endpoints are called as the midwife fills in each step, before the full assessment is submitted. They each need the same structural additions described in Section 3 for their respective sections.

| Endpoint | Section | Additional field needed |
|---|---|---|
| `POST /assessments/vitals` | Step 2 | `spo2`, `temperature_celsius`, `notes` |
| `POST /assessments/foetal` | Step 3 | `ctg_notes` |
| `POST /assessments/vaginal` | Step 4 | `examination_notes`, support `-1` for cervical_dilation |
| `POST /assessments/signs-symptoms` | Step 2 | Full `condKeys` list + `other_symptoms` |
| `POST /assessments/risk-factors` | Step 5 | All 10 UI risk factor keys listed above |

Each real-time endpoint **response** should echo back the current running `priority` and any newly triggered `alerts[]` so the UI can display live threshold warnings.

---

## 6. `PUT /assessments/{id}/disposition`

### Current assumed body
```json
{
  "status": "string",
  "location": "string",
  "outcome": "string",
  "outcomeNotes": "string",
  "reassessDue": "string"
}
```

### What the UI captures that needs to be added

**`status` accepted values** (from `STATUS_OPTIONS` in the UI):
```
"Waiting" | "Under Assessment" | "Transferred to labour suite" | "Monitored" | "Discharged" | "Escalated"
```

**`location` accepted values** (from `LOCATION_OPTIONS` in the UI):
```
"Triage Bay" | "Labour Suite" | "Theatre" | "ICU" | "Ward" | "Discharged" | "Transferred"
```

**`outcome` accepted values** (from `OUTCOME_OPTIONS` in the UI):
```
"Ongoing management" | "Transferred to labour suite" | "Awaiting theatre" | "Escalated to ICU" | "Discharged home" | "Referred out"
```

### New fields to add — Doctor Acknowledgment

The PatientDetailsScreen has a `SignaturePad` for doctor sign-off. This data has no persistence path. Add a `doctorAcknowledgment` object to the disposition update:

```json
{
  "status": "Under Assessment",
  "location": "Triage Bay",
  "outcome": "Ongoing management",
  "outcomeNotes": "BP responding to Nifedipine, bed rest continues",
  "reassessDue": "15:00",
  "doctorAcknowledgment": {
    "doctorName": "Dr. A. Mokoena",
    "hpcsaNumber": "MP0123456",
    "signatureData": "<svg>...</svg>",
    "acknowledgedAt": "2026-05-07T09:30:00Z"
  },
  "dischargeAuthorization": null
}
```

**Or** expose two separate endpoints:
- `POST /assessments/{id}/doctor-ack` — `{ doctorName, hpcsaNumber, signatureData }`
- `POST /assessments/{id}/discharge-auth` — `{ doctorName, hpcsaNumber, signatureData }`

The `dischargeAuthorization` block is only populated when `outcome = "Discharged home"` and the discharge `SignaturePad` is submitted.

---

## 7. `POST /notes`

### Current accepted body
```json
{
  "patientFileId": "number",
  "content": "string",
  "addedBy": "string"
}
```

### Add `noteType` to distinguish the three note sources in the UI

```json
{
  "patientFileId": 7,
  "content": "CTG trace showing occasional early decelerations. Baseline variability adequate.",
  "addedBy": "Sr. Khumalo",
  "noteType": "ctg_monitoring"
}
```

**`noteType` accepted values:**
| Value | Source in UI | Section |
|---|---|---|
| `vital_signs` | "Vital Signs Notes" textarea | TriageScreen Step 2 + PatientDetails |
| `ctg_monitoring` | "CTG Monitoring Notes" + Step 3 notes | PatientDetails CTG card |
| `handover` | "Handover Notes" | PatientDetails Handover card |
| `outcome_progress` | "Progress Notes" | PatientDetails Outcome card |

### `GET /notes/by-file/{patientFileId}` — response should include `noteType`

```json
[
  {
    "id": 501,
    "patientFileId": 7,
    "content": "...",
    "addedBy": "Sr. Khumalo",
    "noteType": "handover",
    "createdAt": "2026-05-07T08:00:00Z"
  }
]
```

---

## 8. CTG Scan File Upload — New Endpoint Required

The PatientDetailsScreen has a full file upload feature (`ctgScans[]`) accepting images and PDFs. There is currently no file upload endpoint in the API.

### Suggested new endpoint
```
POST /patient-files/{patientFileId}/ctg-scans
Content-Type: multipart/form-data
```

**Form fields:**
| Field | Type | Description |
|---|---|---|
| `file` | file (binary) | Image or PDF file |
| `comment` | string | Clinical note attached to this scan |
| `uploadedBy` | string | User name of uploader |

**Response:**
```json
{
  "id": 601,
  "patientFileId": 7,
  "fileName": "ctg_trace_09h15.pdf",
  "fileUrl": "https://...",
  "comment": "Reactive trace, no decels",
  "uploadedBy": "Sr. Khumalo",
  "uploadedAt": "2026-05-07T09:15:00Z"
}
```

**GET endpoint needed:**  
`GET /patient-files/{patientFileId}/ctg-scans` — returns list for PatientDetailsScreen to pre-load uploaded scans on patient open.

---

## 9. `GET /assessment-alerts` — Response Fields Needed

The AlertsScreen lists P1 patients with a name, triage time, condition summary, and an acknowledge button.

The alert response object must include:

```json
{
  "id": 201,
  "assessmentId": 101,
  "patientId": 42,
  "patientName": "Nomsa Khumalo",
  "priority": 1,
  "type": "priority_1_triage",
  "condition": "Severe Pre-Eclampsia",
  "triggeredAt": "2026-05-07T09:15:00Z",
  "acknowledged": false,
  "acknowledgedBy": null,
  "acknowledgedAt": null,
  "resolved": false,
  "resolvedAt": null
}
```

| Missing field | Where used in AlertsScreen |
|---|---|
| `patientName` | Displayed as the alert card title |
| `condition` | Shown below the patient name as the presenting condition |
| `priority` | Controls card colour (P1 = red) |
| `triggeredAt` | Shown as triage timestamp |

---

## 10. `PUT /assessment-alerts/{id}/acknowledge`

### Current assumed body
```json
{ "acknowledgedBy": "string" }
```

No changes needed to the request body. Confirm the response echoes the updated object:
```json
{
  "id": 201,
  "acknowledged": true,
  "acknowledgedBy": "Sr. Nkosi",
  "acknowledgedAt": "2026-05-07T09:22:00Z"
}
```

---

## 11. Management Checklist — `GET /management-checklists/by-assessment/{id}`

The API auto-generates checklist items. These items **must exactly match** the clinical text the UI currently displays per priority level. Seed data requirements:

### P1 checklist items (must be returned when `priority = 1`)
1. CALL FOR HELP immediately — alert duty doctor and charge midwife
2. Position patient left lateral; protect airway
3. Administer O₂ 10–15 L/min via non-rebreather mask (target SpO₂ >95%)
4. Establish TWO large-bore IV lines (14–16G); draw FBC, LFTs, coagulation, U&E
5. MgSO₄ loading dose: 4g IV over 15–20 min in 200ml NaCl 0.9%
6. If BP ≥160/110: Nifedipine 10mg PO; repeat after 30 min if needed
7. Insert Foley catheter; hourly urine output monitoring
8. Transfer to labour ward / high-care IMMEDIATELY — do not leave patient alone
9. Prepare resuscitation trolley; summon neonatologist if delivery imminent

### P2 checklist items (must be returned when `priority = 2`)
1. Notify advanced midwife / duty doctor within 10 minutes
2. IV access; restricted fluids (Ringer's Lactate 80 ml/hr unless contraindicated)
3. Continuous CTG; document FHR baseline and variability
4. Commence oral antihypertensive if BP 150–159/100–109 per protocol
5. MgSO₄ prophylaxis as indicated by clinical picture
6. Prepare theatre if obstetric emergency anticipated
7. Reassess every 10 min; escalate to P1 if deterioration

### P3 checklist items (must be returned when `priority = 3`)
1. Place patient in designated waiting area (≤ 30 min wait)
2. Record full vital signs; repeat in 15 minutes
3. Non-pharmacological comfort measures (positioning, breathing exercises)
4. Continue prescribed antihypertensives; manage blood glucose if diabetic
5. Flag for early medical officer review of risk factors
6. Re-triage immediately if clinical status changes

### P4 checklist items (must be returned when `priority = 4`)
1. Direct to waiting area (up to 1 hour wait)
2. Routine observations on arrival
3. Assess presenting complaint; advise on warning signs for urgent review
4. Medical officer may down-refer after comprehensive assessment
5. Provide written information leaflet on when to return

---

## 12. `GET /patients/{id}/summary` — Response Shape Needed

The PatientDetailsScreen assembles display data from multiple sources. This endpoint should return a single denormalized object:

```json
{
  "id": 42,
  "patientFileId": 7,
  "name": "Nomsa",
  "surname": "Khumalo",
  "dob": "1995-04-12",
  "contact": "+27 81 674 3322",
  "gestational_age_weeks": 38,
  "gravida": 2,
  "para": 1,
  "latestAssessment": {
    "id": 101,
    "priority": 1,
    "status": "Under Assessment",
    "location": "Triage Bay",
    "outcome": "Ongoing management",
    "outcomeNotes": "...",
    "reassessDue": "15:00",
    "assessedAt": "2026-05-07T09:15:00Z",
    "vitals": {
      "bp_systolic": 162, "bp_diastolic": 112,
      "heart_rate": 100, "respiration_rate": 20,
      "spo2": 97, "temperature_celsius": 37.1, "notes": "..."
    },
    "foetalMonitoring": { "foetal_heart_rate": 148, "foetal_movement": "present", "ctg_notes": "..." },
    "vaginalExam": { "cervical_dilation": 3, "examination_notes": "..." },
    "signsSymptoms": { "sev_pec": true },
    "riskFactors": { "chr_htn": true },
    "managementChecklist": [ { "id": 301, "item": "...", "completed": false } ],
    "alerts": [ { "id": 201, "acknowledged": false } ],
    "doctorAcknowledgment": null,
    "dischargeAuthorization": null,
    "triggeredRules": [ { "priority": 1, "text": "BP ≥160/110" } ]
  },
  "notes": [
    { "id": 501, "noteType": "handover", "content": "...", "addedBy": "Sr. Khumalo", "createdAt": "..." }
  ],
  "ctgScans": [
    { "id": 601, "fileName": "trace.pdf", "fileUrl": "...", "comment": "...", "uploadedAt": "..." }
  ],
  "timeline": [
    { "id": 701, "title": "Triaged", "detail": "P1 — Severe Pre-Eclampsia", "tone": "#DC2626", "time": "09:15" }
  ],
  "assessmentHistory": [
    { "id": 100, "priority": 2, "assessedAt": "2026-05-06T14:00:00Z" }
  ]
}
```

> The `timeline` array drives the PatientDetailsScreen's "Patient Timeline" section. If a separate `POST /timeline-events` endpoint is not provided, the UI can reconstruct the timeline from `notes` + `assessmentHistory` — but a pre-built `timeline[]` in the summary response is preferred.

---

## 13. `GET /patients` — Response Shape

PatientsScreen shows a triage queue. Each patient row needs priority and condition derived from the latest assessment, not the patient root object:

```json
[
  {
    "id": 42,
    "patientFileId": 7,
    "name": "Nomsa",
    "surname": "Khumalo",
    "latestAssessment": {
      "id": 101,
      "priority": 1,
      "status": "Under Assessment",
      "condition": "Severe Pre-Eclampsia",
      "assessedAt": "2026-05-07T09:15:00Z",
      "acknowledged": false
    }
  }
]
```

`priority` and `acknowledged` must come from `latestAssessment`. The UI's `patient.p` (priority) should be mapped from `patient.latestAssessment.priority`.

---

## Summary of All Changes Required

| Endpoint | Add to request | Add to response |
|---|---|---|
| `POST /patients` | `gestational_age_weeks`, `gravida`, `para` | `patientFileId` |
| `POST /patient-file-entries` | New `category: "urinalysis"` with keys `protein`, `leukocytes`, `haematuria` | — |
| `POST /assessments` | `signsSymptoms.other_symptoms`; `vitals.spo2`, `vitals.temperature_celsius`, `vitals.notes`; `foetalMonitoring.ctg_notes`; `vaginalExam.examination_notes`; all 10 UI risk factor keys | `priority`, `triggeredRules`, `managementChecklist[]`, `alerts[]` |
| `POST /assessments/evaluate` | Same as above | `riskHits[]`, `missingInputs[]`, `shiftHints[]` |
| `POST /assessments/vitals` | `spo2`, `temperature_celsius`, `notes` | `priority`, `alerts[]` |
| `POST /assessments/foetal` | `ctg_notes` | `priority`, `alerts[]` |
| `POST /assessments/vaginal` | `examination_notes`, `-1` support for `cervical_dilation` | `priority`, `alerts[]` |
| `POST /assessments/signs-symptoms` | All 30 `condKeys` + `other_symptoms` | `priority`, `alerts[]` |
| `POST /assessments/risk-factors` | All 10 UI risk factor keys | `priority`, `alerts[]` |
| `PUT /assessments/{id}/disposition` | `doctorAcknowledgment{}`, `dischargeAuthorization{}`, enum values for `status`/`location`/`outcome` | Full updated assessment |
| `POST /notes` | `noteType` field | `noteType` in response |
| `GET /notes/by-file/{id}` | — | `noteType` in each item |
| `GET /assessment-alerts` | — | `patientName`, `condition`, `priority`, `triggeredAt` |
| `GET /patients` | — | `latestAssessment.priority`, `latestAssessment.condition`, `latestAssessment.acknowledged` |
| `GET /patients/{id}/summary` | — | Full shape per Section 12 |
| **NEW** `POST /patient-files/{id}/ctg-scans` | `file` (binary), `comment`, `uploadedBy` | `id`, `fileUrl`, `uploadedAt` |
| **NEW** `GET /patient-files/{id}/ctg-scans` | — | List of scan objects |

---

## Appendix A — Risk Factor Key Reference

These are the exact `fieldKey` values used in the UI. The API must accept these as-is, or provide a definitive list and the UI code will be aligned to match.

```
prev_cs       → Previous Caesarean Section
chr_htn       → Chronic Hypertension
diabetes      → Diabetes Mellitus (pre-existing)
grand_multi   → Grand Multiparity (≥5 deliveries)
adv_age       → Advanced Maternal Age (≥35 years)
multi_preg    → Multiple Pregnancy (twins/triplets)
rhesus        → Rhesus Incompatibility
hiv           → HIV Positive
anaemia       → Severe Anaemia (Hb <7 g/dL)
prev_pph      → Previous Post-Partum Haemorrhage
```

## Appendix B — Condition Key Reference

These are the exact `condKeys` values the UI sends as `signsSymptoms` boolean flags:

```
eclampsia             imminent_eclampsia    aph
cord_prolapse         loc                   mec3
prev_csection_twice   fresh_scar_labour     absent_fetal_movement
advanced_labour       cephalopelvic         sev_pec
preterm               pprom                 multi_labour
sob                   msl_grade1_2          plac_praevia
pre_ec                gest_htn              gest_dm
vbac                  grand_multi           multigravida_latent
post_dates            false_labour          uti
nv                    mild_cx               routine
```

