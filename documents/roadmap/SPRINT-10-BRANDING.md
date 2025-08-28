# SPRINT 10: Branding Update
*Created: August 26, 2025*
*Duration: 1-2 hours per Claude*
*Status: COMPLETED*

## Sprint Objective
Update all user-facing text from "Gamma Timetable Extension" to "Productory Powerups for Gamma" platform branding. **NO FUNCTIONALITY CHANGES** - text/copy updates only.

## Scope Definition
- ✅ Text and copy changes only
- ✅ Branding consistency across extension and web app  
- ❌ No new features or functionality
- ❌ No architectural changes
- ❌ No database schema changes

## Team Assignments

### Claude II: Plugin Branding Tasks

**Target Files to Update:**
1. **Extension Manifest** (`packages/extension/manifest.json`):
   - Update `name`: "Productory Powerups for Gamma"
   - Update `description`: Include platform messaging
   - Update `short_name` (if exists)

2. **UI Component Text** (search for hardcoded strings):
   - Sidebar headers/titles
   - User-facing messages
   - Notification text
   - Extension popup text (if exists)

3. **Documentation Updates**:
   - Extension README.md
   - Any developer documentation references

**Search Commands to Use:**
```bash
grep -r "Gamma Timetable" packages/extension/
grep -r "timetable extension" packages/extension/
```

**Acceptance Criteria:**
- No user-facing text says just "Gamma Timetable" without platform context
- All extension UI reflects platform branding
- Manifest.json properly branded for Chrome Store

### Claude III: Web App Branding Tasks  

**Target Areas to Update:**
1. **Page Structure** (`packages/web/` or `packages/web-next/`):
   - HTML page titles in layout files
   - Meta tags and descriptions  
   - Navigation/header text

2. **Component Copy**:
   - Homepage hero section
   - Dashboard page headings
   - Authentication page copy
   - Footer text
   - Button labels and form titles
   - Success/error messages

**Search Commands to Use:**
```bash
grep -r "Gamma Timetable" packages/web*/
grep -r "timetable" packages/web*/src/
```

**Acceptance Criteria:**
- Consistent "Productory Powerups" platform messaging
- Landing pages communicate platform vision
- User journey shows clear connection between tool and platform

## Branding Guidelines

### Primary Branding
- **Platform Name**: "Productory Powerups"
- **Tool Designation**: "for Gamma" or "Gamma Edition"  
- **Tagline Options**:
  - "Productivity enhancements for your favorite tools"
  - "Supercharge your Gamma presentations"
  - "Built by educators, for educators"

### Messaging Hierarchy
1. **Lead with Platform**: "Productory Powerups for Gamma"
2. **Explain Tool Focus**: "Transform Gamma presentations..."
3. **Hint at Expansion**: "Part of growing productivity suite"

### What to Avoid
- ❌ Just "Gamma Timetable Extension" (too narrow)
- ❌ Generic "productivity tool" (not specific enough)
- ❌ Over-promising features not yet built

## Definition of Done

### Both Claudes Must Verify:
1. **Consistency Check**: Extension and web app use same platform name
2. **User Journey**: Clear connection from Chrome Store → Extension → Web App
3. **Future-Proof**: Messaging works for planned feature expansion

### Test Scenarios:
1. **New User Flow**: Install extension → Sign in → Should see coherent platform story
2. **Existing User**: Current users should understand the platform evolution
3. **Chrome Store Preview**: Listing should communicate platform vision clearly

## Success Metrics
- User sees consistent "Productory Powerups" branding across all touchpoints
- Platform positioning clear without confusing current functionality  
- Foundation set for expanding beyond just timetable features

---

**Sprint Owner**: Jarmo Tuisk  
**Assigned to**: Claude II (Extension), Claude III (Web App)
**Target Completion**: Same day
**Next Sprint**: Feature development continues with consistent branding in place