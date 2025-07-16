(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const o of t.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&i(o)}).observe(document,{childList:!0,subtree:!0});function s(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function i(e){if(e.ep)return;e.ep=!0;const t=s(e);fetch(e.href,t)}})();console.log("Gamma Timetable Web Dashboard - Coming Soon");document.addEventListener("DOMContentLoaded",()=>{const n=document.getElementById("app");if(n){const r=document.createElement("div");r.style.cssText="padding: 20px; background: #f0f0f0; margin: 20px; border-radius: 8px;",r.innerHTML=`
      <h2>Development Status</h2>
      <ul>
        <li>✅ Sprint 0: Foundation (In Progress)</li>
        <li>🔄 Sprint 1: Authentication & Dashboard Shell</li>
        <li>⏳ Sprint 2: Manual Sync & Data Management</li>
        <li>⏳ Sprint 3: Auto-Sync & Offline Support</li>
      </ul>
    `,n.appendChild(r)}});
