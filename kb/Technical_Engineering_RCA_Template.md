# Technical Engineering RCA – Internal Template

## Incident Metadata
- **Incident Title:**  
- **Incident ID / JIRA Ticket:**  
- **Date Detected:**  
- **Detected By:**  
- **Owner:**  
- **Severity Level:** (SEV-1 / SEV-2 / SEV-3)  
- **Status:**  

---

## 1. Summary
A concise overview of what happened, why it mattered, and current status.

---

## 2. Impact Assessment

### User Impact
- % of users affected  
- Impacted regions/customers  
- Impacted workflows/features  
- Duration of impact  
- Data corruption/loss (Yes/No)  

### System Impact
- Affected microservices  
- Dependencies impacted  
- Infrastructure components (DB, cache, queue, etc.)  

---

## 3. Detailed Timeline (IST)
Add timestamped sequence of events from detection → investigation → mitigation → resolution.

---

## 4. Root Cause Analysis

### Primary Root Cause
Explain exactly what failed.

### Secondary / Contributing Factors
- Missing tests  
- Missing alerts  
- Infra bottlenecks  
- Design limitations  

---

## 5. Technical Deep Dive
- Architecture components affected  
- Deployment versions  
- Logs & metrics summaries  
- Infra anomalies  

---

## 6. Resolution Steps

### Short-Term Mitigation
- Rollback actions  
- Cache flushes  
- Service restarts  

### Permanent Fix
- Code fixes  
- Test coverage improvements  
- Infra changes  

---

## 7. Preventive Actions
(Add a table in your environment)

| Preventive Action | Owner | ETA | Status |
|-------------------|--------|------|--------|
| Add unit tests | Backend Team | TBD | Pending |
| Improve logging | SRE Team | TBD | In Progress |
| Infra enhancements | Platform Team | TBD | Planned |

---

## 8. Lessons Learned
### What went well
-  

### What didn’t go well
-  

### What will be changed
-  

---

## 9. Action Items
- [ ] Add integration tests  
- [ ] Improve logging  
- [ ] Update runbooks  
- [ ] Enable canary releases  

---

## 10. Final Notes / Ongoing Monitoring
Add monitoring steps or follow-up actions post-fix.

