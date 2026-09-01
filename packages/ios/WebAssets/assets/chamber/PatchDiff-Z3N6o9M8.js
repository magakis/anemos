import{D as _,a9 as Je,aa as kt,ab as Lt,ac as wt,aA as zt,aB as Ot,aC as Et,aD as Bt,ad as At,aE as Gt,aF as Vt,$ as $e,aG as $t,aH as Wt,a7 as Qe,a8 as _t,aI as jt,q as D}from"./renderMobileApp-BJc-XcrQ.js";import{c as Tt,y as C,C as Re,x as ie,D as qt,b as Ht,E as Kt,F as Y,G as Yt,H as Xt,t as Jt,e as Qt,a as ce,i as We,m as Ie,k as ue,f as Zt,I as en,J as Te,u as O,z as ye,w as tn,j as Ze,A as ne,K as _e,L as pe,M as je,N as me,B as Rt,O as Pe}from"./isDiffPlainText-c-B85xJf.js";import{z as P}from"./chamber-CMpz4nWW.js";function qe(e,t,n){if(e===t||e==null||t==null)return e===t;const i=new Set(n),r=Object.keys(e),o=new Set(Object.keys(t));for(const s of r)if(o.delete(s),!i.has(s)&&(!(s in t)||e[s]!==t[s]))return!1;for(const s of Array.from(o))if(!i.has(s))return!1;return!0}function Dt(e,t){const n=e?.theme??_,i=t?.theme??_,r=et(e),o=et(t);return Tt(n,i)&&qe(e,t,["theme","parseDiffOptions"])&&qe(r,o)}function et(e){if(e!=null&&"parseDiffOptions"in e)return e.parseDiffOptions}function tt(e,t){return e?.start===t?.start&&e?.end===t?.end&&e?.side===t?.side&&e?.endSide===t?.endSide}function nn(){return C({tagName:"button",properties:{"data-utility-button":"",type:"button"},children:[Re({name:"diffs-icon-plus",properties:{"data-icon":""}})]})}function rn(e,t){return e.lineNumber===t.lineNumber&&e.side===t.side}var on=class{mode;options;hoveredLine;hoveredToken;pre;gutterUtilityLine;gutterUtilityContainer;gutterUtilityButton;gutterUtilitySlot;interactiveLinesAttr=!1;interactiveLineNumbersAttr=!1;hasPointerListeners=!1;hasDocumentPointerListeners=!1;selectedRange=null;activeLineHighlightSide;activeLineNumberOnly=!1;editorAttached=!1;proposedSelectedRange;renderedSelectionRange;selectionAnchor;queuedSelectionRender;pointerSession={mode:"idle"};constructor(e,t){this.mode=e,this.options=t}setOptions(e){this.options=e}cleanUp(){this.pre?.removeEventListener("click",this.handlePointerClick),this.pre?.removeEventListener("pointerdown",this.handlePointerDown),this.pre?.removeEventListener("pointermove",this.handlePointerMove),this.pre?.removeEventListener("pointerleave",this.handlePointerLeave),this.pre?.removeAttribute("data-interactive-lines"),this.pre?.removeAttribute("data-interactive-line-numbers"),this.pre=void 0,this.gutterUtilityContainer?.remove(),this.gutterUtilityLine=void 0,this.gutterUtilityContainer=void 0,this.gutterUtilityButton=void 0,this.gutterUtilitySlot=void 0,this.clearHoveredLine(),this.clearHoveredToken(),this.detachDocumentPointerListeners(),this.clearPointerSession(),this.queuedSelectionRender!=null&&(cancelAnimationFrame(this.queuedSelectionRender),this.queuedSelectionRender=void 0),this.interactiveLinesAttr=!1,this.interactiveLineNumbersAttr=!1,this.hasPointerListeners=!1}setup(e){this.setSelectionDirty();const{usesCustomGutterUtility:t=!1,enableGutterUtility:n=!1}=this.options;this.pre!==e&&(this.cleanUp(),this.pre=e),n?this.ensureGutterUtilityNode(t):this.gutterUtilityContainer!=null&&(this.gutterUtilityContainer.remove(),this.gutterUtilityLine=void 0,this.gutterUtilityContainer=void 0,this.gutterUtilityButton=void 0,this.gutterUtilitySlot=void 0,this.pointerSession.mode==="gutterSelecting"&&(this.clearPointerSession(),this.detachDocumentPointerListeners())),this.syncPointerListeners(e),this.updateInteractiveLineAttributes(),this.renderSelection(),this.placeUtility()}setSelectionDirty(){this.renderedSelectionRange=void 0}setEditorAttached(e){this.editorAttached!==e&&(this.editorAttached=e,this.setSelectionDirty(),this.renderSelection())}isSelectionDirty(){return this.renderedSelectionRange===null}setSelection(e,t){const n=!(e===this.selectedRange||tt(e??void 0,this.selectedRange??void 0));!this.isSelectionDirty()&&!n||(this.proposedSelectedRange=void 0,this.selectedRange=e,this.activeLineHighlightSide=t?.activeLineSide,this.activeLineNumberOnly=t?.lineNumberOnly??!1,this.renderSelection(),this.placeUtility(),n&&t?.notify!==!1&&this.notifySelectionCommitted())}getSelection(){return this.selectedRange}getHoveredLine=()=>{const e=this.gutterUtilityLine??this.hoveredLine;if(e!=null){if(this.mode==="diff"&&e.type==="diff-line")return{lineNumber:e.lineNumber,side:e.annotationSide};if(this.mode==="file"&&e.type==="line")return{lineNumber:e.lineNumber}}};handlePointerClick=e=>{const{onHunkExpand:t,onLineClick:n,onLineNumberClick:i,onTokenClick:r,onMergeConflictActionClick:o}=this.options;t==null&&n==null&&i==null&&o==null&&r==null||this.options.onGutterUtilityClick!=null&&Ce(e.composedPath())||(V(this.options.__debugPointerEvents,"click","FileDiff.DEBUG.handlePointerClick:",e),this.handlePointerEvent({eventType:"click",event:e}))};handlePointerMove=e=>{if(e.pointerType!=="mouse")return;const{lineHoverHighlight:t="disabled",onLineEnter:n,onLineLeave:i,onTokenEnter:r,onTokenLeave:o,enableGutterUtility:s=!1}=this.options;t==="disabled"&&!s&&n==null&&i==null&&r==null&&o==null||(V(this.options.__debugPointerEvents,"move","FileDiff.DEBUG.handlePointerMove:",e),this.handlePointerEvent({eventType:"move",event:e}))};handlePointerLeave=e=>{const{__debugPointerEvents:t}=this.options;if(V(t,"move","FileDiff.DEBUG.handlePointerLeave: no event"),this.hoveredLine==null&&this.hoveredToken==null){V(t,"move","FileDiff.DEBUG.handlePointerLeave: returned early, no hovered line or token");return}this.hoveredToken!=null&&(this.options.onTokenLeave?.(this.hoveredToken,e),this.clearHoveredToken()),this.hoveredLine!=null&&(this.options.onLineLeave?.({...this.hoveredLine,event:e}),this.clearHoveredLine()),this.placeUtility()};handlePointerEvent({eventType:e,event:t}){const{__debugPointerEvents:n}=this.options,i=t.composedPath();V(n,e,"FileDiff.DEBUG.handlePointerEvent:",{eventType:e,composedPath:i});const r=this.resolvePointerTarget(i);V(n,e,"FileDiff.DEBUG.handlePointerEvent: resolvePointerTarget result:",r);const{onLineClick:o,onLineNumberClick:s,onLineEnter:a,onLineLeave:l,onTokenClick:f,onTokenEnter:h,onTokenLeave:d,onHunkExpand:c,onMergeConflictActionClick:u}=this.options;switch(e){case"move":{const p=Ue(r)&&this.hoveredLine?.lineElement===r.lineElement;He(r)&&this.hoveredToken?.tokenElement===r.tokenElement||(this.hoveredToken!=null&&(d?.(this.hoveredToken,t),this.clearHoveredToken()),He(r)&&(this.setHoveredToken(this.toTokenEventBaseProps(r)),h?.(this.hoveredToken,t))),p||(this.hoveredLine!=null&&(l?.({...this.hoveredLine,event:t}),this.clearHoveredLine()),Ue(r)?(this.setHoveredLine(this.toEventBaseProps(r)),this.placeUtility(),a?.({...this.hoveredLine,event:t})):this.placeUtility());break}case"click":{if(r==null)break;if(ln(r)&&u!=null){u(r);break}if(an(r)&&c!=null){c(r.hunkIndex,r.all||t.shiftKey?"both":r.direction,r.all||t.shiftKey?Number.POSITIVE_INFINITY:void 0);break}if(!Ue(r))break;He(r)&&f!=null&&f(this.toTokenEventBaseProps(r),t);const p=this.toEventBaseProps(r);s!=null&&r.numberColumn?s({...p,event:t}):o?.({...p,event:t});break}}}syncPointerListeners(e){const{__debugPointerEvents:t,lineHoverHighlight:n="disabled",onLineClick:i,onLineNumberClick:r,onLineEnter:o,onLineLeave:s,onTokenClick:a,onTokenEnter:l,onTokenLeave:f,onHunkExpand:h,onMergeConflictActionClick:d,enableGutterUtility:c=!1,enableLineSelection:u=!1,onGutterUtilityClick:p}=this.options,b=p!=null,g=n!=="disabled"||i!=null||r!=null||o!=null||s!=null||a!=null||l!=null||f!=null||h!=null||d!=null||c||u||b;g&&!this.hasPointerListeners?(e.addEventListener("click",this.handlePointerClick),e.addEventListener("pointerdown",this.handlePointerDown),e.addEventListener("pointermove",this.handlePointerMove),e.addEventListener("pointerleave",this.handlePointerLeave),this.hasPointerListeners=!0,V(t,"click","FileDiff.DEBUG.attachEventListeners: Attaching click events for:",(()=>{const m=[];return(t==="both"||t==="click")&&(i!=null&&m.push("onLineClick"),r!=null&&m.push("onLineNumberClick"),h!=null&&m.push("expandable hunk separators"),d!=null&&m.push("merge conflict actions")),m})()),V(t,"move","FileDiff.DEBUG.attachEventListeners: Attaching pointer move event"),V(t,"move","FileDiff.DEBUG.attachEventListeners: Attaching pointer leave event")):!g&&this.hasPointerListeners&&(e.removeEventListener("click",this.handlePointerClick),e.removeEventListener("pointerdown",this.handlePointerDown),e.removeEventListener("pointermove",this.handlePointerMove),e.removeEventListener("pointerleave",this.handlePointerLeave),this.hasPointerListeners=!1);const v=this.pointerSession.mode==="selecting"||this.pointerSession.mode==="pendingSingleLineUnselect",S=this.pointerSession.mode==="gutterSelecting";(!u&&v||!b&&S)&&(this.clearPointerSession(),this.detachDocumentPointerListeners(),this.selectionAnchor=void 0,this.clearPendingSingleLineState())}updateInteractiveLineAttributes(){if(this.pre==null)return;const{onLineClick:e,onLineNumberClick:t,enableLineSelection:n=!1}=this.options,i=e!=null,r=t!=null||n;i&&!this.interactiveLinesAttr?(this.pre.setAttribute("data-interactive-lines",""),this.interactiveLinesAttr=!0):!i&&this.interactiveLinesAttr&&(this.pre.removeAttribute("data-interactive-lines"),this.interactiveLinesAttr=!1),r&&!this.interactiveLineNumbersAttr?(this.pre.setAttribute("data-interactive-line-numbers",""),this.interactiveLineNumbersAttr=!0):!r&&this.interactiveLineNumbersAttr&&(this.pre.removeAttribute("data-interactive-line-numbers"),this.interactiveLineNumbersAttr=!1)}handlePointerDown=e=>{if(e.pointerType==="mouse"&&e.button!==0||this.pre==null||this.pointerSession.mode!=="idle")return;const t=e.composedPath();Ce(t)&&this.options.onGutterUtilityClick!=null?this.startGutterSelectionFromPointerDown(e):(e.pointerType!=="mouse"&&this.revealUtilityFromGutterPath(t),this.startLineSelectionFromPointerDown(e))};startLineSelectionFromPointerDown(e){const{enableLineSelection:t=!1}=this.options;if(!t)return;const n=this.resolveSelectionInfo(e,{source:"event-path",requireNumberColumn:!0});if(n==null)return;const{pre:i}=this;if(i==null)return;e.preventDefault();const{lineNumber:r,eventSide:o,lineIndex:s}=n;if(e.shiftKey&&this.selectedRange!=null){const a=this.getIndexesFromSelection(this.selectedRange,i.getAttribute("data-diff-type")==="split");if(a==null)return;const l=a.start<=a.end?s>=a.start:s<=a.end;this.selectionAnchor={lineNumber:l?this.selectedRange.start:this.selectedRange.end,side:l?this.selectedRange.side:this.selectedRange.endSide??this.selectedRange.side},this.updateSelection(r,o,!1),this.notifySelectionStart(this.getCurrentSelectionRange()),this.pointerSession={mode:"selecting",pointerId:e.pointerId},this.attachDocumentPointerListeners();return}if(this.selectedRange?.start===r&&this.selectedRange?.end===r){const a={lineNumber:r,side:o};this.selectionAnchor=a,this.pointerSession={mode:"pendingSingleLineUnselect",pointerId:e.pointerId,anchor:a,pending:a},this.attachDocumentPointerListeners();return}this.options.controlledSelection===!0?this.proposedSelectedRange=null:this.selectedRange=null,this.placeUtility(),this.selectionAnchor={lineNumber:r,side:o},this.updateSelection(r,o,!1),this.notifySelectionStart(this.getCurrentSelectionRange()),this.pointerSession={mode:"selecting",pointerId:e.pointerId},this.attachDocumentPointerListeners()}startGutterSelectionFromPointerDown(e){const{enableLineSelection:t=!1,onGutterUtilityClick:n}=this.options;if(n==null)return;const i=this.currentSelectionEnds(),r=i?.bottom??this.resolveSelectionPoint(e,{source:"event-path",excludeUtility:!1}),o=i?.top??r;r==null||o==null||(e.preventDefault(),e.stopPropagation(),this.pointerSession={mode:"gutterSelecting",pointerId:e.pointerId,anchor:o,current:r},t&&(this.selectionAnchor={lineNumber:o.lineNumber,side:o.side},this.updateSelection(r.lineNumber,r.side,!1),this.notifySelectionStart(this.getCurrentSelectionRange())),this.attachDocumentPointerListeners())}handleDocumentPointerMove=e=>{const{enableLineSelection:t=!1}=this.options;switch(this.pointerSession.mode){case"idle":return;case"gutterSelecting":{if(e.pointerId!==this.pointerSession.pointerId)return;e.preventDefault();const n=this.resolveSelectionPoint(e,{source:"coordinates-first"});if(n==null)return;this.pointerSession.current=n,t===!0&&this.updateSelection(n.lineNumber,n.side);return}case"selecting":{if(e.pointerId!==this.pointerSession.pointerId)return;e.preventDefault();const n=this.resolveSelectionInfo(e,{source:"coordinates-first",requireNumberColumn:!1});if(n==null||this.selectionAnchor==null)return;this.updateSelection(n.lineNumber,n.eventSide);return}case"pendingSingleLineUnselect":{if(e.pointerId!==this.pointerSession.pointerId)return;e.preventDefault();const n=this.resolveSelectionInfo(e,{source:"coordinates-first",requireNumberColumn:!1});if(n==null||this.selectionAnchor==null)return;const i={lineNumber:n.lineNumber,side:n.eventSide};if(rn(this.pointerSession.pending,i))return;this.updateSelection(n.lineNumber,n.eventSide,!1),this.notifySelectionStart(this.getCurrentSelectionRange()),this.notifySelectionChangeDelta(),this.pointerSession={mode:"selecting",pointerId:e.pointerId};return}}};handleDocumentPointerUp=e=>{const{enableLineSelection:t=!1,onGutterUtilityClick:n}=this.options;switch(this.pointerSession.mode){case"idle":return;case"gutterSelecting":{if(e.pointerId!==this.pointerSession.pointerId)return;e.preventDefault();const i=this.resolveSelectionPoint(e,{source:"coordinates-first"});i!=null&&(this.pointerSession.current=i,t&&this.updateSelection(i.lineNumber,i.side)),n?.(this.buildSelectedLineRange(this.pointerSession.anchor,this.pointerSession.current)),this.selectionAnchor=void 0,t&&(this.notifySelectionEnd(this.getCurrentSelectionRange()),this.notifySelectionCommitted(),this.clearProposedSelection()),this.clearPointerSession(),this.detachDocumentPointerListeners();return}case"pendingSingleLineUnselect":if(e.pointerId!==this.pointerSession.pointerId)return;e.preventDefault(),this.updateSelection(null,void 0,!1),this.selectionAnchor=void 0,this.clearPendingSingleLineState(),this.detachDocumentPointerListeners(),this.notifySelectionEnd(this.getCurrentSelectionRange()),this.notifySelectionCommitted(),this.clearProposedSelection();return;case"selecting":if(e.pointerId!==this.pointerSession.pointerId)return;e.preventDefault(),this.selectionAnchor=void 0,this.detachDocumentPointerListeners(),this.clearPointerSession(),this.notifySelectionEnd(this.getCurrentSelectionRange()),this.notifySelectionCommitted(),this.clearProposedSelection()}};handleDocumentPointerCancel=e=>{switch(this.pointerSession.mode){case"idle":return;case"gutterSelecting":case"selecting":case"pendingSingleLineUnselect":if("pointerId"in this.pointerSession&&e.pointerId!==this.pointerSession.pointerId)return;this.selectionAnchor=void 0,this.clearProposedSelection(),this.clearPendingSingleLineState(),this.clearPointerSession(),this.detachDocumentPointerListeners()}};clearHoveredLine(){this.hoveredLine!=null&&(this.hoveredLine.lineElement.removeAttribute("data-hovered"),this.hoveredLine.numberElement.removeAttribute("data-hovered"),this.hoveredLine=void 0)}setHoveredLine(e){const{lineHoverHighlight:t="disabled"}=this.options;this.hoveredLine!=null&&this.clearHoveredLine(),this.hoveredLine=e,t!=="disabled"&&((t==="both"||t==="line")&&this.hoveredLine.lineElement.setAttribute("data-hovered",""),(t==="both"||t==="number")&&this.hoveredLine.numberElement.setAttribute("data-hovered",""))}clearHoveredToken(){this.hoveredToken!=null&&(this.hoveredToken=void 0)}setHoveredToken(e){this.hoveredToken!=null&&this.clearHoveredToken(),this.hoveredToken=e}ensureGutterUtilityNode(e){if(this.gutterUtilityContainer==null&&(this.gutterUtilityContainer=document.createElement("div"),this.gutterUtilityContainer.setAttribute("data-gutter-utility-slot","")),e)this.gutterUtilityButton!=null&&(this.gutterUtilityButton.remove(),this.gutterUtilityButton=void 0),this.gutterUtilitySlot==null&&(this.gutterUtilitySlot=document.createElement("slot"),this.gutterUtilitySlot.name="gutter-utility-slot"),this.gutterUtilitySlot.parentNode!==this.gutterUtilityContainer&&this.gutterUtilityContainer.replaceChildren(this.gutterUtilitySlot);else{if(this.gutterUtilitySlot?.remove(),this.gutterUtilitySlot=void 0,this.gutterUtilityButton==null){const t=document.createElement("div");t.innerHTML=ie(nn());const n=t.firstElementChild;if(!(n instanceof HTMLButtonElement))throw new Error("InteractionManager.ensureGutterUtilityNode: Node element should be a button");n.remove(),this.gutterUtilityButton=n}this.gutterUtilityButton.parentNode!==this.gutterUtilityContainer&&this.gutterUtilityContainer.replaceChildren(this.gutterUtilityButton)}}revealUtilityFromGutterPath(e){if(this.placeUtilityFromSelection())return;const t=this.resolvePointerTarget(e);ge(t)&&t.numberColumn&&this.showUtilityOnLine(this.toEventBaseProps(t))}placeUtility(){if(!this.placeUtilityFromSelection()){if(this.hoveredLine!=null){this.showUtilityOnLine(this.hoveredLine);return}this.hideUtility()}}placeUtilityFromSelection(){const e=this.currentSelectionEnds();if(e==null)return!1;const t=this.targetForSelectionPoint(e.bottom);return t==null?this.hideUtility():this.showUtilityOnLine(this.toEventBaseProps(t)),!0}showUtilityOnLine(e){this.gutterUtilityContainer!=null&&(this.gutterUtilityLine=e,e.numberElement.appendChild(this.gutterUtilityContainer))}hideUtility(){this.gutterUtilityContainer?.remove(),this.gutterUtilityLine=void 0}currentSelectionEnds(){const e=this.getCurrentSelectionRange();return e==null?void 0:this.selectionEnds(e)}selectionEnds(e){const t={lineNumber:e.start,side:e.side},n={lineNumber:e.end,side:e.endSide??e.side},i=this.selectionPointRowIndex(t),r=this.selectionPointRowIndex(n);if(!(i==null||r==null))return i>r?{top:n,bottom:t}:{top:t,bottom:n}}selectionPointRowIndex(e){const t=this.getLineIndex(e.lineNumber,e.side);if(t!=null)return this.isSplitDiff()?t[1]:t[0]}targetForSelectionPoint(e){if(this.pre==null)return;const t=this.getLineIndex(e.lineNumber,e.side);if(t==null)return;const n=this.mode==="diff"?`${t[0]},${t[1]}`:`${t[0]}`,i=this.pre.querySelectorAll(`[data-column-number="${e.lineNumber}"][data-line-index="${n}"]`);for(const r of i){if(!(r instanceof HTMLElement))continue;const o=this.resolvePointerTarget(xe(r));if(ge(o)&&!(this.mode==="diff"&&e.side!=null&&o.side!==e.side))return o}}attachDocumentPointerListeners(){this.hasDocumentPointerListeners||(document.addEventListener("pointermove",this.handleDocumentPointerMove),document.addEventListener("pointerup",this.handleDocumentPointerUp),document.addEventListener("pointercancel",this.handleDocumentPointerCancel),this.hasDocumentPointerListeners=!0)}detachDocumentPointerListeners(){this.hasDocumentPointerListeners&&(document.removeEventListener("pointermove",this.handleDocumentPointerMove),document.removeEventListener("pointerup",this.handleDocumentPointerUp),document.removeEventListener("pointercancel",this.handleDocumentPointerCancel),this.hasDocumentPointerListeners=!1)}clearPointerSession(){this.pointerSession={mode:"idle"}}clearPendingSingleLineState(){this.pointerSession.mode==="pendingSingleLineUnselect"&&(this.pointerSession={mode:"idle"})}selectionInfoFromPath(e,t){const n=this.resolvePointerTarget(e);if(ge(n)&&!(t&&!n.numberColumn)&&n.splitLineIndex!=null)return{lineIndex:n.splitLineIndex,lineNumber:n.lineNumber,eventSide:this.mode==="diff"?n.side:void 0}}resolveSelectionInfo(e,t){const n=this.resolveSelectionPath(e,t);return n!=null?this.selectionInfoFromPath(n,t.requireNumberColumn):void 0}selectionPointFromPath(e){const t=this.resolvePointerTarget(e);if(ge(t))return{lineNumber:t.lineNumber,side:this.mode==="diff"?t.side:void 0}}resolveSelectionPoint(e,t){const n=this.resolveSelectionPath(e,t);return n!=null?this.selectionPointFromPath(n):void 0}resolveSelectionPath(e,t){const n=t.excludeUtility!==!1;switch(t.source){case"event-path":return this.pathFromEventPath(e.composedPath(),n);case"coordinates-first":{const i=this.pathFromCoordinates(e,n);return i!==void 0?i??void 0:this.pathFromEventPath(e.composedPath(),n)}}}pathFromCoordinates(e,t){const n=this.hitTest(e);if(n!==void 0)return n===null?null:this.pathFromElement(n,t)??null}pathFromEventPath(e,t){if(!(t&&Ce(e))){for(const n of e)if(n instanceof Element)return this.pathFromElement(n,t)}}pathFromElement(e,t){const n=xe(e);if(t&&Ce(n))return;const i=fn(e);return i!=null?xe(i):this.pathFromAnnotationSlot(e)}pathFromAnnotationSlot(e){const t=cn(hn(e));if(t==null)return;const n=this.targetForSelectionPoint(t);return n!=null?xe(n.lineElement):void 0}hitTest(e){if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return;const t=this.pre?.getRootNode(),n=rt(t)?t:rt(document)?document:void 0;if(n!=null)return n.elementFromPoint(e.clientX,e.clientY)}getLineIndex(e,t){const{getLineIndex:n}=this.options;return n!=null?n(e,t):[e-1,e-1]}getCurrentSelectionRange(){return this.proposedSelectedRange!==void 0?this.proposedSelectedRange:this.selectedRange}clearProposedSelection(){this.proposedSelectedRange=void 0}updateSelection(e,t,n=!0){const i=this.getCurrentSelectionRange();let r;if(e==null)r=null;else{const o=this.selectionAnchor?.side??t,s=this.selectionAnchor?.lineNumber??e;r=this.buildSelectionRange(s,e,o,t)}tt(i??void 0,r??void 0)||(this.activeLineHighlightSide=void 0,this.activeLineNumberOnly=!1,this.options.controlledSelection===!0?this.proposedSelectedRange=r:(this.selectedRange=r,this.queuedSelectionRender??=requestAnimationFrame(this.renderSelection)),this.placeUtility(),n&&this.notifySelectionChangeDelta())}getIndexesFromSelection(e,t){if(this.pre==null)return;const n=this.getLineIndex(e.start,e.side),i=this.getLineIndex(e.end,e.endSide??e.side);return n!=null&&i!=null?{start:t?n[1]:n[0],end:t?i[1]:i[0]}:void 0}highlightLineNumberOnly(){return this.activeLineHighlightSide!=null?this.activeLineNumberOnly:this.activeLineNumberOnly||this.editorAttached}renderSelection=()=>{if(this.queuedSelectionRender!=null&&(cancelAnimationFrame(this.queuedSelectionRender),this.queuedSelectionRender=void 0),this.pre==null||this.renderedSelectionRange===this.selectedRange)return;const e=this.pre.querySelectorAll("[data-selected-line]");for(const l of e)l.removeAttribute("data-selected-line");if(this.renderedSelectionRange=this.selectedRange,this.selectedRange==null)return;const{children:t}=this.pre;if(t.length===0)return;if(t.length>2)throw console.error(t),new Error("InteractionManager.renderSelection: Somehow there are more than 2 code elements...");const n=this.pre.getAttribute("data-diff-type")==="split",i=this.getIndexesFromSelection(this.selectedRange,n);if(i==null)throw console.error({rowRange:i,selectedRange:this.selectedRange}),new Error("InteractionManager.renderSelection: No valid rowRange");const r=i.start===i.end,o=Math.min(i.start,i.end),s=Math.max(i.start,i.end),a=this.highlightLineNumberOnly();for(const l of t){const f=this.activeLineHighlightSide;if(f!=null&&(f==="additions"&&l.hasAttribute("data-deletions")||f==="deletions"&&l.hasAttribute("data-additions")))continue;const[h,d]=l.children,c=d.children.length;if(c!==h.children.length)throw new Error("InteractionManager.renderSelection: gutter and content children dont match, something is wrong");for(let u=0;u<c;u++){const p=d.children[u],b=h.children[u];if(!(p instanceof HTMLElement)||!(b instanceof HTMLElement))continue;const g=this.parseLineIndex(p,n);if((g??0)>s)break;if(g==null||g<o)continue;let v=r?"single":g===o?"first":g===s?"last":"";b.setAttribute("data-selected-line",v),!a&&(p.setAttribute("data-selected-line",v),b.nextSibling instanceof HTMLElement&&p.nextSibling instanceof HTMLElement&&(p.nextSibling.hasAttribute("data-line-annotation")||p.nextSibling.hasAttribute("data-merge-conflict-actions"))&&(r?(v="last",p.setAttribute("data-selected-line","first")):g===o?v="":g===s&&p.setAttribute("data-selected-line",""),p.nextSibling.setAttribute("data-selected-line",v),b.nextSibling.setAttribute("data-selected-line",v)))}}};notifySelectionCommitted(){this.options.onLineSelected?.(this.getCurrentSelectionRange()??null)}notifySelectionChangeDelta(){this.options.onLineSelectionChange?.(this.getCurrentSelectionRange()??null)}notifySelectionStart(e){this.options.onLineSelectionStart?.(e)}notifySelectionEnd(e){this.options.onLineSelectionEnd?.(e)}toEventBaseProps(e){return this.mode==="file"?{type:"line",lineElement:e.lineElement,lineNumber:e.lineNumber,numberColumn:e.numberColumn,numberElement:e.numberElement}:{type:"diff-line",annotationSide:e.side,lineType:e.lineType,lineElement:e.lineElement,numberElement:e.numberElement,lineNumber:e.lineNumber,numberColumn:e.numberColumn}}toTokenEventBaseProps({lineCharEnd:e,lineCharStart:t,lineNumber:n,side:i,tokenElement:r,tokenText:o}){return this.mode==="file"?{type:"token",lineCharEnd:e,lineCharStart:t,lineNumber:n,tokenElement:r,tokenText:o}:{type:"token",lineCharEnd:e,lineCharStart:t,lineNumber:n,side:i,tokenElement:r,tokenText:o}}buildSelectedLineRange(e,t){return this.buildSelectionRange(e.lineNumber,t.lineNumber,e.side,t.side)}buildSelectionRange(e,t,n,i){return{start:e,end:t,...n!=null?{side:n}:{},...n!==i&&i!=null?{endSide:i}:{}}}resolvePointerTarget(e){let t=!1,n,i,r,o,s,a,l,f,h,d;for(const u of e){if(!(u instanceof HTMLElement))continue;if(d==null&&u.hasAttribute("data-merge-conflict-action")){const v=u.getAttribute("data-merge-conflict-action")??void 0,S=u.getAttribute("data-merge-conflict-conflict-index")??void 0,m=S!=null?Number.parseInt(S,10):NaN;dn(v)&&Number.isFinite(m)&&(d={kind:"merge-conflict-action",resolution:v,conflictIndex:m})}if(a==null&&u.hasAttribute("data-char")){a=u;const v=u.getAttribute("data-char");if(v!=null){const S=Number.parseInt(v,10);if(!Number.isNaN(S)){const m=u.textContent??"",y=S+m.length;(m.trim()!==""||this.options.enableTokenInteractionsOnWhitespace===!0)&&(l={tokenElement:a,lineCharStart:S,lineCharEnd:y,tokenText:m});continue}}}const p=s==null?u.getAttribute("data-column-number")??void 0:void 0;if(p!=null){s=u,h=Number.parseInt(p,10),t=!0,n=st(u),o=u.getAttribute("data-line-index")??void 0;continue}const b=r==null?u.getAttribute("data-line")??void 0:void 0;if(b!=null){r=u,h=Number.parseInt(b,10),n=st(u),o=u.getAttribute("data-line-index")??void 0;continue}if(f==null&&(u.hasAttribute("data-expand-button")||u.hasAttribute("data-unmodified-lines"))){f={hunkIndex:void 0,direction:u.hasAttribute("data-expand-up")?"up":u.hasAttribute("data-expand-down")?"down":"both",all:u.hasAttribute("data-expand-all-button")};continue}const g=f!=null?u.getAttribute("data-expand-index")??void 0:void 0;if(f!=null&&g!=null){const v=Number.parseInt(g,10);Number.isNaN(v)||(f.hunkIndex=v);continue}if(i==null&&u.hasAttribute("data-code")){i=u;break}}if(d!=null)return d;if(f?.hunkIndex!=null)return{type:"line-info",hunkIndex:f.hunkIndex,direction:f.direction,all:f.all};if(r??=o!=null?it(i,`[data-line][data-line-index="${o}"]`):void 0,s??=o!=null?it(i,`[data-column-number][data-line-index="${o}"]`):void 0,i==null||r==null||s==null||n==null||h==null||Number.isNaN(h))return;const c=this.parseLineIndex(r,this.isSplitDiff());return l!=null?this.mode==="file"?{kind:"token",lineType:n,lineElement:r,lineNumber:h,numberColumn:t,numberElement:s,side:void 0,splitLineIndex:c,...l}:{kind:"token",lineType:n,lineElement:r,lineNumber:h,numberColumn:t,numberElement:s,side:ot(n,i),splitLineIndex:c,...l}:this.mode==="file"?{kind:"line",lineType:n,lineElement:r,lineNumber:h,numberColumn:t,numberElement:s,side:void 0,splitLineIndex:c}:{kind:"line",lineType:n,lineElement:r,lineNumber:h,numberColumn:t,numberElement:s,side:ot(n,i),splitLineIndex:c}}isSplitDiff(){return this.pre?.getAttribute("data-diff-type")==="split"}parseLineIndex(e,t){const n=(e.getAttribute("data-line-index")??"").split(",").map(i=>Number.parseInt(i,10)).filter(i=>!Number.isNaN(i));if(t&&n.length===2)return n[1];if(!t)return n[0]}};function nt({enableTokenInteractionsOnWhitespace:e,enableGutterUtility:t,lineHoverHighlight:n,onGutterUtilityClick:i,onLineClick:r,onLineEnter:o,onLineLeave:s,onLineNumberClick:a,onTokenClick:l,onTokenEnter:f,onTokenLeave:h,renderGutterUtility:d,__debugPointerEvents:c,enableLineSelection:u,controlledSelection:p,onLineSelected:b,onLineSelectionStart:g,onLineSelectionChange:v,onLineSelectionEnd:S},m,y,x){return{enableTokenInteractionsOnWhitespace:e,enableGutterUtility:sn({enableGutterUtility:t,renderGutterUtility:d,onGutterUtilityClick:i}),usesCustomGutterUtility:d!=null,lineHoverHighlight:n,onGutterUtilityClick:i,onHunkExpand:m,onMergeConflictActionClick:x,onLineClick:r,onLineEnter:o,onLineLeave:s,onLineNumberClick:a,onTokenClick:l,onTokenEnter:f,onTokenLeave:h,__debugPointerEvents:c,enableLineSelection:u,controlledSelection:p,onLineSelected:b,onLineSelectionStart:g,onLineSelectionChange:v,onLineSelectionEnd:S,getLineIndex:y}}function sn({enableGutterUtility:e,renderGutterUtility:t,onGutterUtilityClick:n}){if(n!=null&&t!=null)throw new Error("Cannot use both 'onGutterUtilityClick' and 'renderGutterUtility'. Use only one gutter utility API.");return e??!1}function ge(e){return e!=null&&"kind"in e&&e.kind==="line"}function He(e){return e!=null&&"kind"in e&&e.kind==="token"}function Ue(e){return ge(e)||He(e)}function an(e){return"type"in e&&e.type==="line-info"}function ln(e){return"kind"in e&&e.kind==="merge-conflict-action"}function dn(e){return e==="current"||e==="incoming"||e==="both"}function it(e,t){const n=e?.querySelector(t);return n instanceof HTMLElement?n:void 0}function xe(e){const t=[];let n=e;for(;n!=null;)t.push(n),n=n.parentNode;return t}function fn(e){const t=e.closest("[data-line], [data-column-number]");if(t instanceof HTMLElement)return t;const n=e.closest('[data-line-annotation], [data-gutter-buffer="annotation"]');if(!(n instanceof HTMLElement))return;const i=n.previousElementSibling;return i instanceof HTMLElement&&(i.hasAttribute("data-line")||i.hasAttribute("data-column-number"))?i:void 0}function hn(e){const t=e.closest('[slot^="annotation-"]');if(t instanceof HTMLElement)return t.getAttribute("slot")??void 0;if(e instanceof HTMLElement){const n=e.getAttribute("name")??void 0;return n!=null&&n.startsWith("annotation-")?n:void 0}}function cn(e){if(e==null)return;const t=/^annotation-(?:(additions|deletions)-)?(\d+)$/.exec(e);if(t==null)return;const n=Number.parseInt(t[2],10);if(!(!Number.isFinite(n)||n<=0))return{lineNumber:n,side:t[1]}}function rt(e){return e!=null&&typeof e.elementFromPoint=="function"}function ot(e,t){switch(e){case"change-deletion":return"deletions";case"change-addition":return"additions";default:return t.hasAttribute("data-deletions")?"deletions":"additions"}}function st(e){const t=e.getAttribute("data-line-type");if(t!=null)switch(t){case"change-deletion":case"change-addition":case"context":case"context-expanded":return t;default:return}}function Ce(e){for(const t of e)if(t instanceof HTMLElement&&(t.hasAttribute("data-utility-button")||t.hasAttribute("data-gutter-utility-slot")||t.getAttribute("slot")==="gutter-utility-slot"||t.getAttribute("name")==="gutter-utility-slot"))return!0;return!1}function V(e="none",t,...n){switch(e){case"none":return;case"both":break;case"click":if(t!=="click")return;break;case"move":if(t!=="move")return;break}console.log(...n)}var un=class W{static resizeObserver;static managersByElement=new Map;static getResizeObserver(){const t=W.resizeObserver??new ResizeObserver(W.handleSharedResizeEntries);return W.resizeObserver=t,t}static handleSharedResizeEntries(t){const n=new Map;for(const i of t){const r=W.managersByElement.get(i.target);if(r==null)continue;const o=n.get(r);o==null?n.set(r,[i]):o.push(i)}for(const[i,r]of n)i.handleResizeEntries(r)}observedNodes=new Map;setup(t,n){const i=new Set;let r=0;const o=new Map(this.observedNodes);this.observedNodes.clear();for(const s of t.children){if(r===2)break;const a=(()=>{if(s instanceof HTMLElement&&s.tagName==="CODE")return s})();if(a==null)continue;r++;let l=o.get(a);if(l!=null&&l.type!=="code")throw new Error("ResizeManager.setup: somehow a code node is being used for an annotation, should be impossible");let f=a.firstElementChild;f instanceof HTMLElement||(f=null),l!=null?(this.observedNodes.set(a,l),o.delete(a),l.numberElement!==f?(l.numberElement!=null&&(this.unobserve(l.numberElement),o.delete(l.numberElement)),f!=null&&(this.observe(f),o.delete(f),this.observedNodes.set(f,l)),l.numberElement=f,l.numberWidth=0):l.numberElement!=null?(o.delete(l.numberElement),this.observedNodes.set(l.numberElement,l)):l.numberWidth=0):(l={type:"code",codeElement:a,numberElement:f,codeWidth:"auto",numberWidth:0},this.observedNodes.set(a,l),this.observe(a),f!=null&&(this.observedNodes.set(f,l),this.observe(f)))}if(r>1&&!n){const s=t.querySelectorAll('[data-line-annotation*=","]'),a=new Map;for(const l of s){if(!(l instanceof HTMLElement))continue;const f=l.getAttribute("data-line-annotation")??"";if(!/^-?\d+,-?\d+$/.test(f)){console.error("DiffFileRenderer.setupResizeObserver: Invalid element or annotation",{lineAnnotation:f,element:l});continue}let h=a.get(f);h==null&&(h=[],a.set(f,h)),h.push(l)}for(const[l,f]of a){if(f.length!==2){console.error("DiffFileRenderer.setupResizeObserver: Bad Pair",l,f);continue}const[h,d]=f,c=h.firstElementChild,u=d.firstElementChild;if(!(h instanceof HTMLElement)||!(d instanceof HTMLElement)||!(c instanceof HTMLElement)||!(u instanceof HTMLElement))continue;let p=o.get(c);if(p!=null){this.observedNodes.set(c,p),this.observedNodes.set(u,p),o.delete(c),o.delete(u);continue}const b=c.getBoundingClientRect().height,g=u.getBoundingClientRect().height;p={type:"annotations",column1:{container:h,child:c,childHeight:b},column2:{container:d,child:u,childHeight:g},currentHeight:"auto"},i.add({child1:c,child2:u,item:p,newHeight:Math.max(b,g)})}for(const l of i)this.applyNewHeight(l.item,l.newHeight),this.observedNodes.set(l.child1,l.item),this.observedNodes.set(l.child2,l.item),this.observe(l.child1),this.observe(l.child2);i.clear()}for(const[s,a]of o)this.unobserve(s),a.type==="code"?gn(a):bn(a);o.clear()}cleanUp(){for(const t of this.observedNodes.keys())this.unobserve(t);this.observedNodes.clear()}observe(t){const{managersByElement:n}=W,i=n.get(t);if(i!==this){if(i!=null&&i!==this)throw new Error("ResizeManager.observe: element is already owned by another ResizeManager");n.set(t,this),W.getResizeObserver().observe(t)}}unobserve(t){const{managersByElement:n,resizeObserver:i}=W,r=n.get(t);if(r!=null){if(r!==this)throw new Error("ResizeManager.unobserve: element is owned by another ResizeManager");n.delete(t),i?.unobserve(t),i!=null&&n.size===0&&(i.disconnect(),W.resizeObserver=void 0)}}handleResizeEntries(t){const n=new Map,i=new Set;for(const r of t){const{target:o,borderBoxSize:s,contentBoxSize:a}=r;if(!(o instanceof HTMLElement)){console.error("ResizeManager.handleResizeEntries: Invalid element for ResizeObserver",r);continue}const l=this.observedNodes.get(o);if(l==null){console.error("ResizeManager.handleResizeEntries: Not a valid observed node",r);continue}if(l.type==="annotations"){const f=(()=>{if(o===l.column1.child)return l.column1;if(o===l.column2.child)return l.column2})();if(f==null){console.error("ResizeManager.handleResizeEntries: Couldn't find a column for",{item:l,target:o});continue}f.childHeight=s[0].blockSize,i.add(l)}else if(l.type==="code"){const f=n.get(l)??{},h=a[0].inlineSize;o===l.codeElement?f.codeInlineSize=h:o===l.numberElement&&(f.numberInlineSize=h),n.set(l,f)}}this.applyAnnotationUpdates(i),i.clear(),this.applyColumnUpdates(n),n.clear()}applyAnnotationUpdates(t){for(const n of t)this.applyNewHeight(n,Math.max(n.column1.childHeight,n.column2.childHeight))}applyColumnUpdates=t=>{for(const[n,i]of t){const r=i.codeInlineSize!=null?pn(i.codeInlineSize):n.codeWidth,o=i.numberInlineSize!=null?mn(i.numberInlineSize):n.numberWidth,s=r!==n.codeWidth,a=o!==n.numberWidth;if(!(!s&&!a)&&(n.codeWidth=r,n.numberWidth=o,s&&n.codeElement.style.setProperty("--diffs-column-width",`${typeof r=="number"?`${r}px`:"auto"}`),a&&n.codeElement.style.setProperty("--diffs-column-number-width",`${o===0?"auto":`${o}px`}`),s||a&&r!=="auto")){const l=typeof r=="number"?Math.max(r-o,0):0;n.codeElement.style.setProperty("--diffs-column-content-width",`${l>0?`${l}px`:"auto"}`)}}};applyNewHeight(t,n){n!==t.currentHeight&&(t.currentHeight=Math.max(n,0),t.column1.container.style.setProperty("--diffs-annotation-min-height",`${t.currentHeight}px`),t.column2.container.style.setProperty("--diffs-annotation-min-height",`${t.currentHeight}px`))}};function pn(e){const t=Math.max(Math.floor(e),0);return t===0?"auto":t}function mn(e){return Math.max(Math.ceil(e),0)}function gn(e){e.codeElement.isConnected&&(e.codeElement.style.removeProperty("--diffs-column-content-width"),e.codeElement.style.removeProperty("--diffs-column-number-width"),e.codeElement.style.removeProperty("--diffs-column-width"))}function bn(e){e.column1.container.isConnected&&e.column1.container.style.removeProperty("--diffs-annotation-min-height"),e.column2.container.isConnected&&e.column2.container.style.removeProperty("--diffs-annotation-min-height")}function at(e){for(const t of Array.isArray(e)?e:[e])if(!(t==="text"||t==="ansi")&&!qt.has(t))return!1;return!0}function Fe(e){for(const t of Ht(e))if(!Kt.has(t))return!1;return!0}function Mt(e,t){return e==null||t==null?e===t:e.startingLine===t.startingLine&&e.totalLines===t.totalLines&&e.bufferBefore===t.bufferBefore&&e.bufferAfter===t.bufferAfter}function vn(e){return C({tagName:"div",children:[C({tagName:"div",children:e.annotations?.map(t=>C({tagName:"slot",properties:{name:t}})),properties:{"data-annotation-content":""}})],properties:{"data-line-annotation":`${e.hunkIndex},${e.lineIndex}`}})}function Sn(e){switch(e){case"file":return"diffs-icon-file-code";case"change":return"diffs-icon-symbol-modified";case"new":return"diffs-icon-symbol-added";case"deleted":return"diffs-icon-symbol-deleted";case"rename-pure":case"rename-changed":return"diffs-icon-symbol-moved"}}function yn({fileOrDiff:e,mode:t,stickyHeader:n}){const i="type"in e?e:void 0,r={"data-diffs-header":t,"data-change-type":i?.type,"data-sticky":n?"":void 0};return C({tagName:"div",children:[t==="custom"?C({tagName:"slot",properties:{name:Je}}):xn({name:e.name,prevName:"prevName"in e?e.prevName:void 0,iconType:i?.type??"file"}),...t==="custom"?[]:[Cn(i)]],properties:r})}function xn({name:e,prevName:t,iconType:n}){const i=[C({tagName:"slot",properties:{name:kt}}),Re({name:Sn(n),properties:{"data-change-icon":n}})];return t!=null&&(i.push(C({tagName:"div",children:[C({tagName:"bdi",children:[Y(t)]})],properties:{"data-prev-name":""}})),i.push(Re({name:"diffs-icon-arrow-right-short",properties:{"data-rename-icon":""}}))),i.push(C({tagName:"div",children:[C({tagName:"bdi",children:[Y(e)]})],properties:{"data-title":""}})),i.push(C({tagName:"slot",properties:{name:Lt}})),C({tagName:"div",children:i,properties:{"data-header-content":""}})}function Cn(e){const t=[];if(e!=null){let n=0,i=0;for(const r of e.hunks)n+=r.additionLines,i+=r.deletionLines;(i>0||n===0)&&t.push(C({tagName:"span",children:[Y(`-${i}`)],properties:{"data-deletions-count":""}})),(n>0||i===0)&&t.push(C({tagName:"span",children:[Y(`+${n}`)],properties:{"data-additions-count":""}}))}return t.push(C({tagName:"slot",properties:{name:wt}})),C({tagName:"div",children:t,properties:{"data-metadata":""}})}function kn(e){return C({tagName:"pre",properties:Ln(e)})}function Ln({diffIndicators:e,disableBackground:t,disableLineNumbers:n,overflow:i,split:r,totalLines:o,type:s,customProperties:a}){return{...a,"data-diff":s==="diff"?"":void 0,"data-file":s==="file"?"":void 0,"data-diff-type":s==="diff"?r?"split":"single":void 0,"data-overflow":i,"data-disable-line-numbers":n?"":void 0,"data-background":t?void 0:"","data-indicators":e==="bars"||e==="classic"?e:void 0,tabIndex:0,style:`--diffs-min-number-column-width-default:${`${o}`.length}ch;`}}function wn(e,{theme:t,preferredHighlighter:n="shiki-js"}){return{langs:[e??"text"],themes:Ht(t),preferredHighlighter:n}}function re(e){return`annotation-${"side"in e?`${e.side}-`:""}${e.lineNumber}`}const En="-1,-1";function An(e){return e?.some(t=>t.lineNumber===0)??!1}function lt(e){const t=e[0];return t!=null&&t.length>0?t:void 0}function Nt(e){return e.startingLine===0&&e.totalLines>0}function Tn(e,t){return C({tagName:"div",children:e,properties:{"data-content":"",style:`grid-row: span ${t}`}})}function Hn(e){return e.useTokenTransformer===!0||e.onTokenClick!=null||e.onTokenEnter!=null||e.onTokenLeave!=null}const Rn=`<svg data-icon-sprite aria-hidden="true" width="0" height="0">
  <symbol id="diffs-icon-arrow-right-short" viewBox="0 0 16 16">
    <path d="M8.47 4.22a.75.75 0 0 0 0 1.06l1.97 1.97H3.75a.75.75 0 0 0 0 1.5h6.69l-1.97 1.97a.75.75 0 1 0 1.06 1.06l3.25-3.25a.75.75 0 0 0 0-1.06L9.53 4.22a.75.75 0 0 0-1.06 0"/>
  </symbol>
  <symbol id="diffs-icon-brand-github" viewBox="0 0 16 16">
    <path d="M8 0c4.42 0 8 3.58 8 8a8.01 8.01 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27s-1.36.09-2 .27c-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8"/>
  </symbol>
  <symbol id="diffs-icon-chevron" viewBox="0 0 16 16">
    <path d="M1.47 4.47a.75.75 0 0 1 1.06 0L8 9.94l5.47-5.47a.75.75 0 1 1 1.06 1.06l-6 6a.75.75 0 0 1-1.06 0l-6-6a.75.75 0 0 1 0-1.06"/>
  </symbol>
  <symbol id="diffs-icon-chevrons-narrow" viewBox="0 0 10 16">
    <path d="M4.47 2.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1-1.06 1.06L5 3.81 2.28 6.53a.75.75 0 0 1-1.06-1.06zM1.22 9.47a.75.75 0 0 1 1.06 0L5 12.19l2.72-2.72a.75.75 0 0 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0l-3.25-3.25a.75.75 0 0 1 0-1.06"/>
  </symbol>
  <symbol id="diffs-icon-diff-split" viewBox="0 0 16 16">
    <path d="M14 0H8.5v16H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2m-1.5 6.5v1h1a.5.5 0 0 1 0 1h-1v1a.5.5 0 0 1-1 0v-1h-1a.5.5 0 0 1 0-1h1v-1a.5.5 0 0 1 1 0"/><path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5.5V0zm.5 7.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1" opacity=".3"/>
  </symbol>
  <symbol id="diffs-icon-diff-unified" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M16 14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V8.5h16zm-8-4a.5.5 0 0 0-.5.5v1h-1a.5.5 0 0 0 0 1h1v1a.5.5 0 0 0 1 0v-1h1a.5.5 0 0 0 0-1h-1v-1A.5.5 0 0 0 8 10" clip-rule="evenodd"/><path fill-rule="evenodd" d="M14 0a2 2 0 0 1 2 2v5.5H0V2a2 2 0 0 1 2-2zM6.5 3.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1z" clip-rule="evenodd" opacity=".4"/>
  </symbol>
  <symbol id="diffs-icon-expand" viewBox="0 0 16 16">
    <path d="M3.47 5.47a.75.75 0 0 1 1.06 0L8 8.94l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06"/>
  </symbol>
  <symbol id="diffs-icon-expand-all" viewBox="0 0 16 16">
    <path d="M11.47 9.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 1 1 1.06-1.06L8 12.94zM7.526 1.418a.75.75 0 0 1 1.004.052l4 4a.75.75 0 1 1-1.06 1.06L8 3.06 4.53 6.53a.75.75 0 1 1-1.06-1.06l4-4z"/>
  </symbol>
  <symbol id="diffs-icon-file-code" viewBox="0 0 16 16">
    <path d="M10.75 0c.199 0 .39.08.53.22l3.5 3.5c.14.14.22.331.22.53v9A2.75 2.75 0 0 1 12.25 16h-8.5A2.75 2.75 0 0 1 1 13.25V2.75A2.75 2.75 0 0 1 3.75 0zm-7 1.5c-.69 0-1.25.56-1.25 1.25v10.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25V5h-1.25A2.25 2.25 0 0 1 10 2.75V1.5z"/><path d="M7.248 6.19a.75.75 0 0 1 .063 1.058L5.753 9l1.558 1.752a.75.75 0 0 1-1.122.996l-2-2.25a.75.75 0 0 1 0-.996l2-2.25a.75.75 0 0 1 1.06-.063M8.69 7.248a.75.75 0 1 1 1.12-.996l2 2.25a.75.75 0 0 1 0 .996l-2 2.25a.75.75 0 1 1-1.12-.996L10.245 9z"/>
  </symbol>
  <symbol id="diffs-icon-plus" viewBox="0 0 16 16">
    <path d="M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3"/>
  </symbol>
  <symbol id="diffs-icon-symbol-added" viewBox="0 0 16 16">
    <path d="M8 4a.75.75 0 0 1 .75.75v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5A.75.75 0 0 1 8 4"/><path d="M1.788 4.296c.196-.88.478-1.381.802-1.706s.826-.606 1.706-.802C5.194 1.588 6.387 1.5 8 1.5s2.806.088 3.704.288c.88.196 1.381.478 1.706.802s.607.826.802 1.706c.2.898.288 2.091.288 3.704s-.088 2.806-.288 3.704c-.195.88-.478 1.381-.802 1.706s-.826.607-1.706.802c-.898.2-2.091.288-3.704.288s-2.806-.088-3.704-.288c-.88-.195-1.381-.478-1.706-.802s-.606-.826-.802-1.706C1.588 10.806 1.5 9.613 1.5 8s.088-2.806.288-3.704M8 0C1.412 0 0 1.412 0 8s1.412 8 8 8 8-1.412 8-8-1.412-8-8-8"/>
  </symbol>
  <symbol id="diffs-icon-symbol-deleted" viewBox="0 0 16 16">
    <path d="M4 8a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 8"/><path d="M1.788 4.296c.196-.88.478-1.381.802-1.706s.826-.606 1.706-.802C5.194 1.588 6.387 1.5 8 1.5s2.806.088 3.704.288c.88.196 1.381.478 1.706.802s.607.826.802 1.706c.2.898.288 2.091.288 3.704s-.088 2.806-.288 3.704c-.195.88-.478 1.381-.802 1.706s-.826.607-1.706.802c-.898.2-2.091.288-3.704.288s-2.806-.088-3.704-.288c-.88-.195-1.381-.478-1.706-.802s-.606-.826-.802-1.706C1.588 10.806 1.5 9.613 1.5 8s.088-2.806.288-3.704M8 0C1.412 0 0 1.412 0 8s1.412 8 8 8 8-1.412 8-8-1.412-8-8-8"/>
  </symbol>
  <symbol id="diffs-icon-symbol-diffstat" viewBox="0 0 16 16">
    <path d="M1.788 4.296c.196-.88.478-1.381.802-1.706s.826-.606 1.706-.802C5.194 1.588 6.387 1.5 8 1.5s2.806.088 3.704.288c.88.196 1.381.478 1.706.802s.607.826.802 1.706c.2.898.288 2.091.288 3.704s-.088 2.806-.288 3.704c-.195.88-.478 1.381-.802 1.706s-.826.607-1.706.802c-.898.2-2.091.288-3.704.288s-2.806-.088-3.704-.288c-.88-.195-1.381-.478-1.706-.802s-.606-.826-.802-1.706C1.588 10.806 1.5 9.613 1.5 8s.088-2.806.288-3.704M8 0C1.412 0 0 1.412 0 8s1.412 8 8 8 8-1.412 8-8-1.412-8-8-8"/><path d="M8.75 4.296a.75.75 0 0 0-1.5 0V6.25h-2a.75.75 0 0 0 0 1.5h2v1.5h1.5v-1.5h2a.75.75 0 0 0 0-1.5h-2zM5.25 10a.75.75 0 0 0 0 1.5h5.5a.75.75 0 0 0 0-1.5z"/>
  </symbol>
  <symbol id="diffs-icon-symbol-ignored" viewBox="0 0 16 16">
    <path d="M1.5 8c0 1.613.088 2.806.288 3.704.196.88.478 1.381.802 1.706s.826.607 1.706.802c.898.2 2.091.288 3.704.288s2.806-.088 3.704-.288c.88-.195 1.381-.478 1.706-.802s.607-.826.802-1.706c.2-.898.288-2.091.288-3.704s-.088-2.806-.288-3.704c-.195-.88-.478-1.381-.802-1.706s-.826-.606-1.706-.802C10.806 1.588 9.613 1.5 8 1.5s-2.806.088-3.704.288c-.88.196-1.381.478-1.706.802s-.606.826-.802 1.706C1.588 5.194 1.5 6.387 1.5 8M0 8c0-6.588 1.412-8 8-8s8 1.412 8 8-1.412 8-8 8-8-1.412-8-8m11.53-2.47a.75.75 0 0 0-1.06-1.06l-6 6a.75.75 0 1 0 1.06 1.06z"/>
  </symbol>
  <symbol id="diffs-icon-symbol-modified" viewBox="0 0 16 16">
    <path d="M1.5 8c0 1.613.088 2.806.288 3.704.196.88.478 1.381.802 1.706s.826.607 1.706.802c.898.2 2.091.288 3.704.288s2.806-.088 3.704-.288c.88-.195 1.381-.478 1.706-.802s.607-.826.802-1.706c.2-.898.288-2.091.288-3.704s-.088-2.806-.288-3.704c-.195-.88-.478-1.381-.802-1.706s-.826-.606-1.706-.802C10.806 1.588 9.613 1.5 8 1.5s-2.806.088-3.704.288c-.88.196-1.381.478-1.706.802s-.606.826-.802 1.706C1.588 5.194 1.5 6.387 1.5 8M0 8c0-6.588 1.412-8 8-8s8 1.412 8 8-1.412 8-8 8-8-1.412-8-8m8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
  </symbol>
  <symbol id="diffs-icon-symbol-moved" viewBox="0 0 16 16">
    <path d="M1.788 4.296c.196-.88.478-1.381.802-1.706s.826-.606 1.706-.802C5.194 1.588 6.387 1.5 8 1.5s2.806.088 3.704.288c.88.196 1.381.478 1.706.802s.607.826.802 1.706c.2.898.288 2.091.288 3.704s-.088 2.806-.288 3.704c-.195.88-.478 1.381-.802 1.706s-.826.607-1.706.802c-.898.2-2.091.288-3.704.288s-2.806-.088-3.704-.288c-.88-.195-1.381-.478-1.706-.802s-.606-.826-.802-1.706C1.588 10.806 1.5 9.613 1.5 8s.088-2.806.288-3.704M8 0C1.412 0 0 1.412 0 8s1.412 8 8 8 8-1.412 8-8-1.412-8-8-8"/><path d="M8.495 4.695a.75.75 0 0 0-.05 1.06L10.486 8l-2.041 2.246a.75.75 0 0 0 1.11 1.008l2.5-2.75a.75.75 0 0 0 0-1.008l-2.5-2.75a.75.75 0 0 0-1.06-.051m-4 0a.75.75 0 0 0-.05 1.06l2.044 2.248-1.796 1.995a.75.75 0 0 0 1.114 1.004l2.25-2.5a.75.75 0 0 0-.002-1.007l-2.5-2.75a.75.75 0 0 0-1.06-.05"/>
  </symbol>
  <symbol id="diffs-icon-symbol-ref" viewBox="0 0 16 16">
    <path d="M1.5 8c0 1.613.088 2.806.288 3.704.196.88.478 1.381.802 1.706.286.286.71.54 1.41.73V1.86c-.7.19-1.124.444-1.41.73-.324.325-.606.826-.802 1.706C1.588 5.194 1.5 6.387 1.5 8m4 6.397c.697.07 1.522.103 2.5.103 1.613 0 2.806-.088 3.704-.288.88-.195 1.381-.478 1.706-.802s.607-.826.802-1.706c.2-.898.288-2.091.288-3.704s-.088-2.806-.288-3.704c-.195-.88-.478-1.381-.802-1.706s-.826-.606-1.706-.802C10.806 1.588 9.613 1.5 8 1.5c-.978 0-1.803.033-2.5.103zM0 8c0-6.588 1.412-8 8-8s8 1.412 8 8-1.412 8-8 8-8-1.412-8-8m7-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/>
  </symbol>
</svg>`;function Dn(e,t){return e==null||t==null?e===t:Mn(e.customProperties,t.customProperties)&&e.type===t.type&&e.diffIndicators===t.diffIndicators&&e.disableBackground===t.disableBackground&&e.disableLineNumbers===t.disableLineNumbers&&e.overflow===t.overflow&&e.split===t.split&&e.totalLines===t.totalLines}const dt={};function Mn(e=dt,t=dt){if(e===t)return!0;const n=Object.keys(e),i=Object.keys(t);if(n.length!==i.length)return!1;for(const r of n)if(e[r]!==t[r])return!1;return!0}function Nn(e){const t=document.createElement("div");return t.dataset.annotationSlot="",t.slot=e,t.style.whiteSpace="normal",t}function In(){const e=document.createElement("div");return e.slot="gutter-utility-slot",e.style.position="absolute",e.style.top="0",e.style.bottom="0",e.style.textAlign="center",e.style.whiteSpace="normal",e.style.touchAction="none",e}function Pn(){const e=document.createElement("style");return e.setAttribute(zt,""),e}var Un=`@layer base {
  :host {
    --diffs-font-fallback: "SF Mono", Monaco, Consolas, "Ubuntu Mono", "Liberation Mono",
      "Courier New", monospace;
    --diffs-header-font-fallback: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue",
      "Noto Sans", "Liberation Sans", Arial, sans-serif;
    --diffs-mixer: light-dark(#000, #fff);
    --diffs-gap-fallback: 8px;
    --diffs-scrollbar-gutter-fallback: 6px;
    --diffs-scrollbar-gutter: var(--diffs-scrollbar-gutter-override, var(--diffs-scrollbar-gutter-measured, var(--diffs-scrollbar-gutter-fallback)));
    --diffs-added-light: #0dbe4e;
    --diffs-added-dark: #5ecc71;
    --diffs-modified-light: #009fff;
    --diffs-modified-dark: #69b1ff;
    --diffs-deleted-light: #ff2e3f;
    --diffs-deleted-dark: #ff6762;
    --diffs-warning-light: #d5a910;
    --diffs-warning-dark: #ffd452;
    color-scheme: light dark;
    font-family: var(--diffs-header-font-family, var(--diffs-header-font-fallback));
    font-size: var(--diffs-font-size, 13px);
    line-height: var(--diffs-line-height, 20px);
    font-feature-settings: var(--diffs-font-features);
    --diffs-bg: light-dark(var(--diffs-light-bg, #fff), var(--diffs-dark-bg, #000));
    --diffs-bg-buffer: var(--diffs-bg-buffer-override, light-dark(color-mix(in lab, var(--diffs-bg) 92%, var(--diffs-mixer)), color-mix(in lab, var(--diffs-bg) 92%, var(--diffs-mixer))));
    --diffs-bg-context: var(--diffs-bg-context-override, light-dark(color-mix(in lab, var(--diffs-bg) 98.5%, var(--diffs-mixer)), color-mix(in lab, var(--diffs-bg) 92.5%, var(--diffs-mixer))));
    --diffs-bg-context-gutter: var(--diffs-bg-context-gutter-override, light-dark(color-mix(in lab, var(--diffs-bg-context) 90%, var(--diffs-bg)), color-mix(in lab, var(--diffs-bg-context) 45%, var(--diffs-bg))));
    --diffs-bg-separator: var(--diffs-bg-separator-override, light-dark(color-mix(in lab, var(--diffs-bg) 96%, var(--diffs-mixer)), color-mix(in lab, var(--diffs-bg) 85%, var(--diffs-mixer))));
    --diffs-fg: light-dark(var(--diffs-light, #000), var(--diffs-dark, #fff));
    --diffs-fg-number: var(--diffs-fg-number-override, light-dark(color-mix(in lab, var(--diffs-fg) 65%, var(--diffs-bg)), color-mix(in lab, var(--diffs-fg) 65%, var(--diffs-bg))));
    --diffs-fg-conflict-marker: var(--diffs-fg-conflict-marker-override, var(--diffs-fg-number));
    --diffs-deletion-base: var(--diffs-deletion-color-override, light-dark(var(--diffs-light-deletion-color, var(--diffs-deletion-color, var(--diffs-deleted-light))), var(--diffs-dark-deletion-color, var(--diffs-deletion-color, var(--diffs-deleted-dark)))));
    --diffs-addition-base: var(--diffs-addition-color-override, light-dark(var(--diffs-light-addition-color, var(--diffs-addition-color, var(--diffs-added-light))), var(--diffs-dark-addition-color, var(--diffs-addition-color, var(--diffs-added-dark)))));
    --diffs-modified-base: var(--diffs-modified-color-override, light-dark(var(--diffs-light-modified-color, var(--diffs-modified-color, var(--diffs-modified-light))), var(--diffs-dark-modified-color, var(--diffs-modified-color, var(--diffs-modified-dark)))));
    --diffs-bg-deletion: var(--diffs-bg-deletion-override, light-dark(color-mix(in lab, var(--diffs-bg) 88%, var(--diffs-deletion-base)), color-mix(in lab, var(--diffs-bg) 80%, var(--diffs-deletion-base))));
    --diffs-bg-deletion-emphasis: var(--diffs-bg-deletion-emphasis-override, light-dark(rgb(from var(--diffs-deletion-base) r g b / .15), rgb(from var(--diffs-deletion-base) r g b / .2)));
    --diffs-bg-addition: var(--diffs-bg-addition-override, light-dark(color-mix(in lab, var(--diffs-bg) 88%, var(--diffs-addition-base)), color-mix(in lab, var(--diffs-bg) 80%, var(--diffs-addition-base))));
    --diffs-bg-addition-emphasis: var(--diffs-bg-addition-emphasis-override, light-dark(rgb(from var(--diffs-addition-base) r g b / .15), rgb(from var(--diffs-addition-base) r g b / .2)));
    --diffs-selection-base: var(--diffs-modified-base);
    --diffs-selection-number-fg: light-dark(color-mix(in lab, var(--diffs-selection-base) 65%, var(--diffs-mixer)), color-mix(in lab, var(--diffs-selection-base) 75%, var(--diffs-mixer)));
    background-color: var(--diffs-bg);
    color: var(--diffs-fg);
    display: block;
  }

  pre, code, [data-error-wrapper] {
    isolation: isolate;
    font-family: var(--diffs-font-family, var(--diffs-font-fallback));
    outline: none;
    margin: 0;
    padding: 0;
    display: block;
  }

  pre, code {
    background-color: var(--diffs-bg);
  }

  code {
    contain: content;
  }

  input, button {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  *, :before, :after {
    box-sizing: border-box;
  }

  [data-icon-sprite] {
    display: none;
  }

  [data-diffs-header], [data-separator] {
    font-family: var(--diffs-header-font-family, var(--diffs-header-font-fallback));
  }

  [data-diffs-header][data-sticky] {
    z-index: 1;
    background-color: var(--diffs-bg);
    position: sticky;
    top: 0;
  }

  [data-file-info] {
    color: var(--fg);
    background-color: color-mix(in lab, var(--bg) 98%, var(--fg));
    border-block: 1px solid color-mix(in lab, var(--bg) 95%, var(--fg));
    padding: 10px;
    font-weight: 700;
  }

  [data-diff], [data-file] {
    --diffs-grid-number-column-width: minmax(min-content, max-content);
    --diffs-code-grid: var(--diffs-grid-number-column-width) 1fr;

    &[data-dehydrated] {
      --diffs-code-grid: var(--diffs-grid-number-column-width) minmax(0, 1fr);
    }

    &:hover [data-code]::-webkit-scrollbar-thumb {
      background-color: var(--diffs-bg-context);
    }
  }

  @supports (-webkit-touch-callout: none) {
    :host {
      --diffs-scrollbar-gutter-fallback: 0px;
    }
  }

  [data-line] span {
    color: light-dark(var(--diffs-token-light, var(--diffs-light)), var(--diffs-token-dark, var(--diffs-dark)));
    background-color: light-dark(var(--diffs-token-light-bg, inherit), var(--diffs-token-dark-bg, inherit));
    font-weight: light-dark(var(--diffs-token-light-font-weight, inherit), var(--diffs-token-dark-font-weight, inherit));
    font-style: light-dark(var(--diffs-token-light-font-style, inherit), var(--diffs-token-dark-font-style, inherit));
    text-decoration: light-dark(var(--diffs-token-light-text-decoration, inherit), var(--diffs-token-dark-text-decoration, inherit));
  }

  [data-line], [data-gutter-buffer], [data-column-number], [data-line-annotation], [data-no-newline], [data-merge-conflict], [data-merge-conflict-actions], [data-editor-overlay] {
    --diffs-computed-decoration-bg: var(--diffs-bg);
    --diffs-computed-diff-line-bg: var(--diffs-bg);
    --diffs-computed-selected-line-bg: var(--diffs-bg);
    color: var(--diffs-fg);
    background-color: var(--diffs-line-bg, var(--diffs-bg));

    @media (pointer: fine) {
      &:where([data-hovered]) {
        --diffs-computed-hovered-line-bg: light-dark(color-mix(in lab,
            var(--diffs-computed-selected-line-bg) 97%,
            var(--diffs-bg-hover-override, var(--diffs-mixer))), color-mix(in lab,
            var(--diffs-computed-selected-line-bg) 91%,
            var(--diffs-bg-hover-override, var(--diffs-mixer))));
        --diffs-line-bg: var(--diffs-computed-hovered-line-bg, inherit);
      }
    }
  }

  [data-line], [data-no-newline] {
    &[data-decoration-bg] {
      --mix-deco-light: 92%;
      --mix-deco-dark: 85%;

      &[data-decoration-bg-depth="2"] {
        --mix-deco-light: 88%;
        --mix-deco-dark: 80%;
      }

      &[data-decoration-bg-depth="3"] {
        --mix-deco-light: 85%;
        --mix-deco-dark: 78%;
      }

      @media (pointer: fine) {
        &[data-hovered]:not([data-selected-line]) {
          --mix-deco-light: 85%;
          --mix-deco-dark: 85%;
        }

        &[data-hovered]:not([data-selected-line])[data-decoration-bg-depth="2"] {
          --mix-deco-light: 83%;
          --mix-deco-dark: 83%;
        }

        &[data-hovered]:not([data-selected-line])[data-decoration-bg-depth="3"] {
          --mix-deco-light: 81%;
          --mix-deco-dark: 81%;
        }
      }

      --diffs-computed-decoration-bg: light-dark(color-mix(in lab,
          var(--diffs-bg) var(--mix-deco-light),
          var(--diffs-decoration-bg)), color-mix(in lab,
          var(--diffs-bg) var(--mix-deco-dark),
          var(--diffs-decoration-bg)));
      --diffs-computed-diff-line-bg: var(--diffs-computed-decoration-bg);
      --diffs-computed-selected-line-bg: var(--diffs-computed-decoration-bg);
      --diffs-line-bg: var(--diffs-computed-decoration-bg);
    }
  }

  [data-line-annotation], [data-gutter-buffer="annotation"] {
    --diffs-annotation-bg: var(--diffs-bg-context);
    --diffs-computed-decoration-bg: var(--diffs-annotation-bg);
    --diffs-computed-diff-line-bg: var(--diffs-annotation-bg);
    --diffs-computed-selected-line-bg: var(--diffs-annotation-bg);
    --diffs-line-bg: var(--diffs-annotation-bg);
  }

  [data-merge-conflict-actions], [data-gutter-buffer="merge-conflict-action"], [data-gutter-buffer="merge-conflict-marker-base"], [data-gutter-buffer="merge-conflict-marker-separator"], [data-merge-conflict="marker-base"], [data-merge-conflict="marker-separator"] {
    --diffs-computed-decoration-bg: var(--diffs-bg-context);
    --diffs-computed-diff-line-bg: var(--diffs-bg-context);
    --diffs-computed-selected-line-bg: var(--diffs-bg-context);
    --diffs-line-bg: var(--diffs-bg-context);
  }

  [data-gutter-buffer="merge-conflict-marker-start"], [data-merge-conflict="marker-start"] {
    --diffs-computed-decoration-bg: light-dark(color-mix(in lab,
        var(--diffs-bg) 78%,
        var(--conflict-bg-current-header-override, var(--diffs-addition-base))), color-mix(in lab,
        var(--diffs-bg) 68%,
        var(--conflict-bg-current-header-override, var(--diffs-addition-base))));
    --diffs-computed-diff-line-bg: var(--diffs-computed-decoration-bg);
    --diffs-computed-selected-line-bg: var(--diffs-computed-decoration-bg);
    --diffs-line-bg: var(--diffs-computed-decoration-bg);
  }

  [data-gutter-buffer="merge-conflict-marker-end"], [data-merge-conflict="marker-end"] {
    --diffs-computed-decoration-bg: light-dark(color-mix(in lab,
        var(--diffs-bg) 78%,
        var(--conflict-bg-incoming-header-override, var(--diffs-modified-base))), color-mix(in lab,
        var(--diffs-bg) 68%,
        var(--conflict-bg-incoming-header-override, var(--diffs-modified-base))));
    --diffs-computed-diff-line-bg: var(--diffs-computed-decoration-bg);
    --diffs-computed-selected-line-bg: var(--diffs-computed-decoration-bg);
    --diffs-line-bg: var(--diffs-computed-decoration-bg);
  }

  [data-has-merge-conflict] [data-line-annotation], [data-has-merge-conflict] [data-gutter-buffer="annotation"] {
    --diffs-computed-decoration-bg: var(--diffs-bg);
    --diffs-computed-diff-line-bg: var(--diffs-bg);
    --diffs-computed-selected-line-bg: var(--diffs-bg);
    --diffs-line-bg: var(--diffs-bg);
  }

  :where([data-background]) {
    & [data-gutter-buffer], & [data-column-number] {
      --mix-light: 91%;
      --mix-dark: 85%;
    }

    & [data-line], & [data-no-newline] {
      --mix-light: 88%;
      --mix-dark: 80%;
    }

    & [data-gutter-buffer], & [data-column-number], & [data-line], & [data-no-newline] {
      --diffs-diff-line-mix-target: var(--diffs-bg);

      &[data-line-type="change-deletion"] {
        --diffs-diff-line-mix-target: var(--diffs-bg-deletion-override, var(--diffs-deletion-base));

        @media (pointer: fine) {
          &[data-hovered] {
            --mix-light: 80%;
            --mix-dark: 75%;
          }
        }

        &:where([data-gutter-buffer], [data-column-number]) {
          color: var(--diffs-fg-number-deletion-override, var(--diffs-deletion-base));
          --diffs-diff-line-mix-target: var(--diffs-bg-deletion-number-override, var(--diffs-deletion-base));
        }

        --diffs-computed-diff-line-bg: light-dark(color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-light),
            var(--diffs-diff-line-mix-target)), color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-dark),
            var(--diffs-diff-line-mix-target)));
        --diffs-computed-selected-line-bg: var(--diffs-computed-diff-line-bg);
        --diffs-line-bg: var(--diffs-computed-diff-line-bg, inherit);
      }

      &[data-line-type="change-addition"] {
        --diffs-diff-line-mix-target: var(--diffs-bg-addition-override, var(--diffs-addition-base));

        @media (pointer: fine) {
          &[data-hovered] {
            --mix-light: 80%;
            --mix-dark: 70%;
          }
        }

        &:where([data-gutter-buffer], [data-column-number]) {
          color: var(--diffs-fg-number-addition-override, var(--diffs-addition-base));
          --diffs-diff-line-mix-target: var(--diffs-bg-addition-number-override, var(--diffs-addition-base));
        }

        --diffs-computed-diff-line-bg: light-dark(color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-light),
            var(--diffs-diff-line-mix-target)), color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-dark),
            var(--diffs-diff-line-mix-target)));
        --diffs-computed-selected-line-bg: var(--diffs-computed-diff-line-bg);
        --diffs-line-bg: var(--diffs-computed-diff-line-bg, inherit);
      }

      &[data-merge-conflict="current"] {
        --diffs-diff-line-mix-target: var(--conflict-bg-current-override, var(--diffs-addition-base));

        &:where([data-gutter-buffer], [data-column-number]) {
          color: var(--diffs-fg-number-addition-override, var(--diffs-addition-base));
          --diffs-diff-line-mix-target: var(--conflict-bg-current-number-override, var(--diffs-addition-base));
        }

        @media (pointer: fine) {
          &[data-hovered] {
            --mix-light: 80%;
            --mix-dark: 70%;
          }
        }

        --diffs-computed-diff-line-bg: light-dark(color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-light),
            var(--diffs-diff-line-mix-target)), color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-dark),
            var(--diffs-diff-line-mix-target)));
        --diffs-computed-selected-line-bg: var(--diffs-computed-diff-line-bg);
        --diffs-line-bg: var(--diffs-computed-diff-line-bg, inherit);
      }

      &[data-merge-conflict="incoming"] {
        --diffs-diff-line-mix-target: var(--conflict-bg-incoming-override, var(--diffs-modified-base));

        &:where([data-gutter-buffer], [data-column-number]) {
          color: var(--diffs-modified-base);
          --diffs-diff-line-mix-target: var(--conflict-bg-incoming-number-override, var(--diffs-modified-base));
        }

        @media (pointer: fine) {
          &[data-hovered] {
            --mix-light: 80%;
            --mix-dark: 70%;
          }
        }

        --diffs-computed-diff-line-bg: light-dark(color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-light),
            var(--diffs-diff-line-mix-target)), color-mix(in lab,
            var(--diffs-computed-decoration-bg) var(--mix-dark),
            var(--diffs-diff-line-mix-target)));
        --diffs-computed-selected-line-bg: var(--diffs-computed-diff-line-bg);
        --diffs-line-bg: var(--diffs-computed-diff-line-bg, inherit);
      }
    }
  }

  [data-gutter-buffer], [data-column-number], [data-line], [data-line-annotation], [data-merge-conflict], [data-merge-conflict-actions], [data-no-newline], [data-editor-overlay] {
    --diffs-selection-mix-target: var(--diffs-bg-selection-override, var(--diffs-selection-base));

    &:where([data-editor-overlay]), &:where([data-line], [data-line-annotation], [data-merge-conflict], [data-merge-conflict-actions], [data-no-newline])[data-selected-line] {
      --mix-selection-light: 82%;
      --mix-selection-dark: 75%;

      @media (pointer: fine) {
        &[data-hovered]:not([data-merge-conflict], [data-line-type="change-addition"], [data-line-type="change-deletion"]) {
          --mix-selection-light: 75%;
          --mix-selection-dark: 70%;
        }
      }
    }

    &:where([data-gutter-buffer], [data-column-number])[data-selected-line] {
      --mix-selection-light: 75%;
      --mix-selection-dark: 60%;
      --diffs-selection-mix-target: var(--diffs-bg-selection-number-override, var(--diffs-selection-base));

      @media (pointer: fine) {
        &[data-hovered]:not([data-merge-conflict], [data-line-type="change-addition"], [data-line-type="change-deletion"]) {
          --mix-selection-light: 70%;
          --mix-selection-dark: 55%;
        }
      }
    }

    &:where([data-editor-overlay]), &[data-selected-line] {
      --diffs-computed-selected-line-bg: light-dark(color-mix(in lab,
          var(--diffs-computed-diff-line-bg) var(--mix-selection-light),
          var(--diffs-selection-mix-target)), color-mix(in lab,
          var(--diffs-computed-diff-line-bg) var(--mix-selection-dark),
          var(--diffs-selection-mix-target)));
      --diffs-line-bg: var(--diffs-computed-selected-line-bg, inherit);
    }
  }

  [data-gutter-buffer], [data-column-number] {
    &[data-selected-line] {
      color: var(--diffs-selection-number-fg);
    }
  }

  [data-no-newline] {
    user-select: none;

    & span {
      opacity: .6;
    }
  }

  [data-diff-type="split"][data-overflow="scroll"] {
    grid-template-columns: 1fr 1fr;
    display: grid;

    & [data-additions] {
      border-left: 1px solid var(--diffs-bg);
    }

    & [data-deletions] {
      border-right: 1px solid var(--diffs-bg);
    }
  }

  [data-code] {
    grid-auto-flow: dense;
    grid-template-columns: var(--diffs-code-grid);
    overflow: var(--diffs-overflow-override, scroll) clip;
    overscroll-behavior-x: none;
    tab-size: var(--diffs-tab-size, 2);
    padding-top: var(--diffs-gap-block, var(--diffs-gap-fallback));
    padding-bottom: max(0px,
      calc(var(--diffs-gap-block, var(--diffs-gap-fallback)) -
          var(--diffs-scrollbar-gutter)));
    scrollbar-gutter: stable;
    align-self: flex-start;
    display: grid;
  }

  [data-diffs-scrollbar-measure] {
    opacity: 0;
    pointer-events: none;
    scrollbar-gutter: auto;
    grid-template-columns: none;
    width: 100px;
    height: 100px;
    padding: 0;
    position: absolute;
    top: -200px;
    left: -200px;
  }

  [data-container-size] {
    container-type: inline-size;
  }

  [data-code]::-webkit-scrollbar {
    width: 0;
    height: var(--diffs-scrollbar-gutter);
  }

  [data-code]::-webkit-scrollbar-track {
    background: none;
  }

  [data-code]::-webkit-scrollbar-thumb {
    background-color: #0000;
    background-clip: content-box;
    border: 1px solid #0000;
    border-radius: 3px;
  }

  [data-code]::-webkit-scrollbar-corner {
    background-color: #0000;
  }

  @supports ((-moz-appearance: none)) {
    [data-code] {
      scrollbar-width: thin;
      scrollbar-color: var(--diffs-bg-context) transparent;
      padding-bottom: var(--diffs-gap-block, var(--diffs-gap-fallback));
    }
  }

  [data-diffs-header] ~ [data-diff], [data-diffs-header] ~ [data-file] {
    & [data-code], &[data-overflow="wrap"] {
      padding-top: 0;
    }
  }

  [data-gutter] {
    grid-template-rows: subgrid;
    grid-template-columns: subgrid;
    z-index: 3;
    background-color: var(--diffs-bg);
    grid-column: 1;
    display: grid;
    position: relative;

    & [data-gutter-buffer], & [data-column-number] {
      border-right: var(--diffs-gap-style, 2px solid var(--diffs-bg));
    }
  }

  [data-content] {
    grid-template-rows: subgrid;
    grid-template-columns: subgrid;
    background-color: var(--diffs-bg);
    grid-column: 2;
    min-width: 0;
    display: grid;
  }

  [data-diff-type="split"][data-overflow="wrap"] {
    grid-auto-flow: dense;
    grid-template-columns: repeat(2, var(--diffs-code-grid));
    padding-block: var(--diffs-gap-block, var(--diffs-gap-fallback));
    display: grid;

    & [data-deletions] {
      display: contents;

      & [data-gutter] {
        grid-column: 1;
      }

      & [data-content] {
        border-right: 1px solid var(--diffs-bg);
        grid-column: 2;
      }
    }

    & [data-additions] {
      display: contents;

      & [data-gutter] {
        border-left: 1px solid var(--diffs-bg);
        grid-column: 3;
      }

      & [data-content] {
        grid-column: 4;
      }
    }
  }

  [data-overflow="scroll"] [data-gutter] {
    position: sticky;
    left: 0;
  }

  [data-interactive-lines] [data-line] {
    cursor: pointer;
  }

  [data-interactive-line-numbers] [data-column-number] {
    cursor: pointer;
    touch-action: none;
  }

  [data-content-buffer], [data-gutter-buffer] {
    user-select: none;
    min-height: 1lh;
    position: relative;
  }

  [data-gutter-buffer] {
    padding-left: 2ch;
    padding-right: 1ch;

    &:before {
      content: "";
      min-width: var(--diffs-min-number-column-width, var(--diffs-min-number-column-width-default, 3ch));
      display: block;
    }
  }

  [data-gutter-buffer="annotation"] {
    --diffs-annotation-bg: var(--diffs-bg-context-gutter);
    min-height: 0;
  }

  [data-gutter-buffer="buffer"] {
    --diffs-line-bg: var(--diffs-bg-context-gutter);
  }

  [data-content-buffer] {
    background-position: 5px 0;
    background-size: 8px 8px;
    background-origin: border-box;
    background-image: repeating-linear-gradient(-45deg,
      transparent,
      transparent calc(3px * 1.414),
      var(--diffs-bg-buffer) calc(3px * 1.414),
      var(--diffs-bg-buffer) calc(4px * 1.414));
    grid-column: 1;
  }

  [data-separator] {
    box-sizing: content-box;
    background-color: var(--diffs-bg);
  }

  [data-separator="simple"] {
    min-height: 4px;
  }

  [data-separator="line-info"], [data-separator="line-info-basic"], [data-separator="metadata"], [data-separator="simple"] {
    background-color: var(--diffs-bg-separator);
  }

  [data-separator="line-info"], [data-separator="line-info-basic"], [data-separator="metadata"] {
    height: 32px;
    position: relative;
  }

  [data-separator-wrapper] {
    user-select: none;
    fill: currentColor;
    background-color: var(--diffs-bg);
    align-items: center;
    height: 100%;
    display: flex;
    position: absolute;
    inset-inline: 0;
  }

  [data-content] [data-separator-wrapper] {
    display: none;
  }

  [data-separator="metadata"] [data-separator-wrapper] {
    background-color: var(--diffs-bg-separator);
    height: 100%;
    color: var(--diffs-fg-number);
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: min-content;
    padding-inline: 1ch;
    inset-inline: 100% auto;
    overflow: hidden;
  }

  [data-separator="line-info"] {
    margin-block: var(--diffs-gap-block, var(--diffs-gap-fallback));

    & [data-separator-wrapper] {
      min-width: 16px;
    }
  }

  [data-separator="line-info-basic"], [data-separator="metadata"] {
    margin-block: 0;
  }

  [data-separator="line-info"][data-separator-first] {
    margin-top: 0;
  }

  [data-separator="line-info"][data-separator-last] {
    margin-bottom: 0;
  }

  [data-expand-index] [data-separator-wrapper] {
    grid-template-columns: 32px auto;
    display: grid;
  }

  [data-expand-index] [data-separator-wrapper][data-separator-multi-button] {
    grid-template-columns: 32px 32px auto;
  }

  [data-expand-button], [data-separator-content] {
    background-color: var(--diffs-bg-separator);
    flex: none;
    align-items: center;
    display: flex;
  }

  [data-expand-index] [data-separator-content]:hover {
    cursor: pointer;
    text-decoration: underline;
  }

  [data-expand-button] {
    cursor: pointer;
    min-width: 32px;
    color: var(--diffs-fg-number);
    border-right: 2px solid var(--diffs-bg);
    flex-shrink: 0;
    justify-content: center;
    align-self: stretch;

    &:hover {
      color: var(--diffs-fg);
    }

    &[data-expand-all-button] {
      display: none;
    }
  }

  [data-expand-down] [data-icon] {
    transform: scaleY(-1);
  }

  [data-separator-content] {
    height: 100%;
    color: var(--diffs-fg-number);
    flex: auto;
    justify-content: flex-start;
    padding: 0 1ch;
    overflow: hidden;
  }

  [data-separator="line-info"], [data-separator="line-info-basic"] {
    & [data-separator-content] {
      user-select: none;
      height: 100%;
      overflow: clip;
    }
  }

  [data-unmodified-lines] {
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 0 auto;
    min-width: 0;
    display: block;
    overflow: hidden;
  }

  @supports (width: 1cqi) {
    [data-unified] {
      & [data-separator="line-info"] [data-separator-wrapper] {
        padding-inline: var(--diffs-gap-inline, var(--diffs-gap-fallback));
        width: 100cqi;

        & [data-separator-content] {
          border-radius: 6px;
        }
      }

      & [data-separator="line-info"][data-expand-index] [data-separator-wrapper] [data-separator-content] {
        border-top-left-radius: unset;
        border-bottom-left-radius: unset;
      }
    }

    [data-gutter] {
      & [data-separator="line-info"] [data-separator-wrapper] {
        padding-left: var(--diffs-gap-inline, var(--diffs-gap-fallback));
      }

      & [data-separator="line-info"] [data-separator-content] {
        border-top-left-radius: 6px;
        border-bottom-left-radius: 6px;
      }

      & [data-separator="line-info"][data-expand-index] [data-separator-content] {
        border-top-left-radius: unset;
        border-bottom-left-radius: unset;
      }
    }

    [data-additions] {
      & [data-content] [data-separator="line-info"] {
        background-color: var(--diffs-bg);

        & [data-separator-wrapper] {
          display: none;
        }
      }

      & [data-gutter] [data-separator="line-info"] [data-separator-wrapper] {
        background-color: var(--diffs-bg-separator);
        border-top-right-radius: 6px;
        border-bottom-right-radius: 6px;
        height: 100%;
        display: block;

        & [data-separator-content], & [data-expand-button] {
          display: none;
        }
      }
    }

    [data-overflow="scroll"] [data-additions] [data-gutter] [data-separator="line-info"] [data-separator-wrapper] {
      width: calc(100cqi - var(--diffs-gap-inline, var(--diffs-gap-fallback)));
    }

    [data-overflow="wrap"] [data-additions] [data-content] [data-separator="line-info"] [data-separator-wrapper] {
      background-color: var(--diffs-bg-separator);
      height: 100%;
      margin-right: var(--diffs-gap-inline, var(--diffs-gap-fallback));
      border-top-right-radius: 6px;
      border-bottom-right-radius: 6px;
      display: block;

      & [data-separator-content], & [data-expand-button] {
        display: none;
      }
    }

    [data-separator="line-info"] [data-separator-wrapper] {
      & [data-expand-both], & [data-expand-down], & [data-expand-up] {
        border-top-left-radius: 6px;
        border-bottom-left-radius: 6px;
      }
    }

    @media (pointer: fine) {
      [data-separator="line-info"] [data-separator-wrapper] {
        &[data-separator-multi-button] {
          & [data-expand-up] {
            border-top-left-radius: 6px;
            border-bottom-left-radius: unset;
          }

          & [data-expand-down] {
            border-bottom-left-radius: 6px;
            border-top-left-radius: unset;
          }
        }
      }
    }
  }

  @media (pointer: coarse) {
    [data-separator="line-info-basic"] [data-separator-wrapper][data-separator-multi-button] {
      grid-template-columns: 34px 34px auto;

      & [data-separator-content] {
        grid-column: unset;
        grid-row: unset;
      }
    }

    @supports (width: 1cqi) {
      [data-separator="line-info"] [data-separator-wrapper] {
        & [data-expand-both], & [data-expand-down], & [data-expand-up] {
          border-top-left-radius: 6px;
          border-bottom-left-radius: 6px;
        }

        &[data-separator-multi-button] {
          & [data-expand-up] {
            border-top-left-radius: 6px;
            border-bottom-left-radius: 6px;
          }

          & [data-expand-down] {
            border-bottom-left-radius: unset;
            border-top-left-radius: unset;
          }
        }
      }
    }
  }

  @media (pointer: fine) {
    [data-separator-wrapper][data-separator-multi-button] {
      grid-template-rows: 50% 50%;
      display: grid;

      & [data-separator-content] {
        grid-area: 1 / 2 / -1;
        min-width: min-content;
      }

      & [data-expand-button] {
        grid-column: 1;
      }
    }

    [data-separator="line-info"] [data-separator-wrapper], [data-separator="line-info"] [data-separator-wrapper][data-separator-multi-button] {
      grid-template-columns: 34px auto;
    }

    [data-separator="line-info-basic"][data-expand-index] [data-separator-wrapper] {
      grid-template-columns: 100% auto;
    }

    [data-separator="line-info"], [data-separator="line-info-basic"] {
      & [data-separator-multi-button] {
        & [data-expand-up] {
          border-bottom: 1px solid var(--diffs-bg);
          border-right: 2px solid var(--diffs-bg);
        }

        & [data-expand-down] {
          border-top: 1px solid var(--diffs-bg);
          border-right: 2px solid var(--diffs-bg);
        }
      }
    }
  }

  [data-additions] [data-gutter] [data-separator-wrapper], [data-additions] [data-separator="line-info-basic"] [data-separator-wrapper], [data-content] [data-separator-wrapper] {
    display: none;
  }

  [data-line-annotation] {
    min-height: var(--diffs-annotation-min-height, 0);
    z-index: 2;
  }

  [data-merge-conflict-actions] {
    z-index: 2;
  }

  [data-separator="custom"] {
    grid-template-columns: subgrid;
    display: grid;
  }

  [data-line], [data-column-number], [data-no-newline] {
    padding-inline: 1ch;
    position: relative;
  }

  [data-indicators="classic"] [data-line] {
    padding-inline-start: 2ch;
  }

  [data-indicators="classic"] {
    & [data-line-type="change-addition"], & [data-line-type="change-deletion"] {
      &[data-no-newline], &[data-line] {
        &:before {
          user-select: none;
          width: 1ch;
          height: 1lh;
          display: inline-block;
          position: absolute;
          top: 0;
          left: 0;
        }
      }
    }

    & [data-line-type="change-addition"] {
      &[data-line], &[data-no-newline] {
        &:before {
          content: "+";
          color: var(--diffs-addition-base);
        }
      }
    }

    & [data-line-type="change-deletion"] {
      &[data-line], &[data-no-newline] {
        &:before {
          content: "-";
          color: var(--diffs-deletion-base);
        }
      }
    }
  }

  [data-indicators="bars"] {
    & [data-line-type="change-deletion"], & [data-line-type="change-addition"] {
      &[data-column-number] {
        &:before {
          content: "";
          user-select: none;
          contain: strict;
          width: 4px;
          height: 100%;
          display: block;
          position: absolute;
          top: 0;
          left: 0;
        }
      }
    }

    & [data-line-type="change-deletion"] {
      &[data-column-number] {
        &:before {
          background-image: linear-gradient(0deg,
            var(--diffs-bg-deletion) 50%,
            var(--diffs-deletion-base) 50%);
          background-repeat: repeat;
          background-size: 2px 2px;
          background-size: calc(1lh / round(1lh / 2px))
            calc(1lh / round(1lh / 2px));
        }
      }
    }

    & [data-line-type="change-addition"] {
      &[data-column-number] {
        &:before {
          background-color: var(--diffs-addition-base);
        }
      }
    }
  }

  [data-overflow="wrap"] {
    & [data-line], & [data-annotation-content] {
      white-space: pre-wrap;
      word-break: break-word;
    }
  }

  [data-overflow="scroll"] [data-line] {
    white-space: pre;
    min-height: 1lh;
  }

  [data-column-number] {
    box-sizing: content-box;
    text-align: right;
    user-select: none;
    color: var(--diffs-fg-number);
    padding-left: 2ch;
  }

  [data-line-number-content] {
    min-width: var(--diffs-min-number-column-width, var(--diffs-min-number-column-width-default, 3ch));
    z-index: 1;
    display: inline-block;
    position: relative;
  }

  [data-disable-line-numbers] {
    & [data-gutter-buffer], & [data-column-number] {
      min-width: 4px;
      padding: 0;

      &:before {
        min-width: 0;
      }
    }

    & [data-line-number-content] {
      display: none;
    }

    & [data-gutter-utility-slot] {
      right: unset;
      justify-content: flex-start;
      left: 0;
    }

    &[data-indicators="bars"] [data-gutter-utility-slot] {
      left: 6px;
    }
  }

  [data-file][data-disable-line-numbers] {
    & [data-gutter-buffer], & [data-column-number] {
      border-right: 0;
      min-width: 0;
    }
  }

  [data-diff-span] {
    box-decoration-break: clone;
    border-radius: 3px;
  }

  [data-line-type="change-addition"] [data-diff-span] {
    background-color: var(--diffs-bg-addition-emphasis);
  }

  [data-line-type="change-deletion"] [data-diff-span] {
    background-color: var(--diffs-bg-deletion-emphasis);
  }

  [data-merge-conflict="marker-start"], [data-merge-conflict="marker-base"], [data-merge-conflict="marker-separator"], [data-merge-conflict="marker-end"] {
    color: var(--diffs-fg);
    padding-left: 1ch;
  }

  [data-merge-conflict="marker-start"], [data-merge-conflict="marker-end"] {
    align-items: center;
    display: flex;

    &:after {
      color: var(--diffs-fg-conflict-marker);
      font-size: .75rem;
      font-style: normal;
      line-height: 1.25rem;
      font-family: var(--diffs-header-font-family, var(--diffs-header-font-fallback));
      padding-left: 1ch;
    }
  }

  [data-merge-conflict="marker-start"]:after {
    content: "(Current Change)";
  }

  [data-merge-conflict="marker-end"]:after {
    content: "(Incoming Change)";
  }

  [data-merge-conflict-actions-content] {
    min-height: 1.75rem;
    font-family: var(--diffs-header-font-family, var(--diffs-header-font-fallback));
    color: var(--diffs-fg);
    align-items: center;
    gap: .25rem;
    padding-inline: .5rem;
    font-size: .75rem;
    line-height: 1.2;
    display: flex;
  }

  [data-merge-conflict-action] {
    appearance: none;
    color: var(--diffs-fg-number);
    font: inherit;
    cursor: pointer;
    background: none;
    border: 0;
    padding: 0;
    font-style: normal;
  }

  [data-merge-conflict-action]:hover {
    color: var(--diffs-fg);
  }

  [data-merge-conflict-action="current"]:hover {
    color: var(--diffs-addition-base);
  }

  [data-merge-conflict-action="incoming"]:hover {
    color: var(--diffs-modified-base);
  }

  [data-merge-conflict-action-separator] {
    color: var(--diffs-fg-number);
    opacity: .6;
    user-select: none;
  }

  [data-diffs-header="default"] {
    background-color: var(--diffs-bg);
    justify-content: space-between;
    align-items: center;
    gap: var(--diffs-gap-inline, var(--diffs-gap-fallback));
    min-height: calc(1lh + (var(--diffs-gap-block, var(--diffs-gap-fallback)) * 3));
    z-index: 2;
    flex-direction: row;
    padding-inline: 16px;
    display: flex;
    position: relative;
    top: 0;
  }

  [data-header-content] {
    align-items: center;
    gap: var(--diffs-gap-inline, var(--diffs-gap-fallback));
    white-space: nowrap;
    flex-direction: row;
    min-width: 0;
    display: flex;
  }

  [data-header-content] [data-prev-name], [data-header-content] [data-title] {
    text-overflow: ellipsis;
    white-space: nowrap;
    direction: rtl;
    min-width: 0;
    overflow: hidden;
  }

  [data-prev-name] {
    opacity: .7;
  }

  [data-rename-icon] {
    fill: currentColor;
    flex-grow: 0;
    flex-shrink: 0;
  }

  [data-diffs-header="default"] [data-metadata] {
    white-space: nowrap;
    align-items: center;
    gap: 1ch;
    display: flex;
  }

  [data-diffs-header="default"] [data-additions-count] {
    font-family: var(--diffs-font-family, var(--diffs-font-fallback));
    color: var(--diffs-addition-base);
  }

  [data-diffs-header="default"] [data-deletions-count] {
    font-family: var(--diffs-font-family, var(--diffs-font-fallback));
    color: var(--diffs-deletion-base);
  }

  [data-change-icon] {
    fill: currentColor;
    flex-shrink: 0;
  }

  [data-change-icon="change"], [data-change-icon="rename-pure"], [data-change-icon="rename-changed"] {
    color: var(--diffs-modified-base);
  }

  [data-change-icon="new"] {
    color: var(--diffs-addition-base);
  }

  [data-change-icon="deleted"] {
    color: var(--diffs-deletion-base);
  }

  [data-change-icon="file"] {
    opacity: .6;
  }

  [data-annotation-content] {
    z-index: 2;
    isolation: isolate;
    align-self: flex-start;
    min-width: 0;
    display: flow-root;
    position: relative;
  }

  [data-overflow="scroll"] [data-annotation-content], [data-overflow="scroll"] [data-merge-conflict-actions-content] {
    width: var(--diffs-column-content-width, auto);
    left: var(--diffs-column-number-width, 0);
    position: sticky;
  }

  [data-annotation-slot] {
    text-wrap-mode: wrap;
    word-break: normal;
    white-space-collapse: collapse;
  }

  [data-gutter-utility-slot] {
    touch-action: none;
    justify-content: flex-end;
    display: flex;
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
  }

  [data-utility-button] {
    appearance: none;
    cursor: pointer;
    width: 1lh;
    height: 1lh;
    font-size: var(--diffs-font-size, 13px);
    line-height: var(--diffs-line-height, 20px);
    background-color: var(--diffs-modified-base);
    color: var(--diffs-bg);
    fill: currentColor;
    z-index: 4;
    touch-action: none;
    border: none;
    border-radius: 4px;
    justify-content: center;
    align-items: center;
    margin-right: calc(-1lh + 1ch);
    padding: 0;
    display: flex;
    position: relative;

    &:before {
      content: "";
      display: block;
      position: absolute;
      inset: 0 0 0 -4px;
    }
  }

  [data-decoration-bar-stack] {
    pointer-events: none;
    isolation: isolate;
    z-index: 1;
    background-color: var(--diffs-decoration-bar-color, transparent);
    box-sizing: content-box;
    border-left: 2px solid var(--diffs-bg);
    border-right: 2px solid var(--diffs-bg);
    width: 6px;
    position: absolute;
    top: 0;
    bottom: 0;
    right: -2px;

    [data-decoration-bar-depth="1"] & {
      background-color: color-mix(in lab,
        var(--diffs-bg) 20%,
        var(--diffs-decoration-bar-color, transparent));
    }

    [data-decoration-bar-depth="2"] & {
      background-color: color-mix(in lab,
        var(--diffs-bg) 45%,
        var(--diffs-decoration-bar-color, transparent));
    }

    [data-decoration-bar-depth="3"] & {
      background-color: color-mix(in lab,
        var(--diffs-bg) 65%,
        var(--diffs-decoration-bar-color, transparent));
    }

    [data-decoration-bar-start] & {
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
    }

    [data-decoration-bar-end] & {
      z-index: 3;
      border-bottom-right-radius: 5px;
      border-bottom-left-radius: 5px;
    }
  }

  [data-placeholder] {
    contain: strict;
  }

  [data-error-wrapper] {
    padding: var(--diffs-gap-block, var(--diffs-gap-fallback))
      var(--diffs-gap-inline, var(--diffs-gap-fallback));
    scrollbar-width: none;
    max-height: 400px;
    overflow: auto;

    & [data-error-message] {
      color: var(--diffs-deletion-base);
      font-size: 18px;
      font-weight: bold;
    }

    & [data-error-stack] {
      color: var(--diffs-fg-number);
    }
  }
}

@layer theme, rendered, unsafe;
`;let ke;function Ke(e){if(ke!=null)return ke;const t=e.host;if(typeof HTMLElement<"u"&&t instanceof HTMLElement&&!t.isConnected)return;const n=document.createElement("div");n.setAttribute("data-code",""),n.setAttribute(Ot,"true");const i=document.createElement("div");return i.style.position="relative",i.style.width="200%",i.style.height="200%",n.appendChild(i),e.appendChild(n),ke=Math.max(n.offsetHeight-n.clientHeight,0),n.remove(),ke}function It(e){return`${Et}: ${e==null?"var(--diffs-scrollbar-gutter-fallback)":`${e}px`};`}const Pt="@layer base, theme, rendered, unsafe;",Fn=new RegExp(`${Gn(Et)}\\s*:\\s*[^;]+;`);function zn(e){return`${Pt}
@layer unsafe {
  ${e}
}`}function On(e,t="system",n){return`${Pt}
@layer rendered {
  :host {${t==="system"?"":`
  color-scheme: ${t};`}
  ${It(n)}
  ${e}
  }
}`}function Bn(e,t){const n=It(t);return e.replace(Fn,n)}function Gn(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function ze({code:e,pre:t,columnType:n,rowSpan:i,containerSize:r=!1}={}){return e==null&&(e=document.createElement("code"),e.setAttribute("data-code",""),n!=null&&e.setAttribute(`data-${n}`,""),t?.appendChild(e)),i!=null?e.style.setProperty("grid-row",`span ${i}`):e.style.removeProperty("grid-row"),r?e.setAttribute("data-container-size",""):e.removeAttribute("data-container-size"),e}function Vn(e,t){if(t==null)return;const n=e.shadowRoot??e.attachShadow({mode:"open"});n.innerHTML===""&&(n.innerHTML=t)}function $n(e,{type:t,diffIndicators:n,disableBackground:i,disableLineNumbers:r,overflow:o,split:s,totalLines:a,customProperties:l}){if(l!=null)for(const f in l){const h=l[f];h!=null&&e.setAttribute(f,`${h}`)}switch(t==="diff"?(e.setAttribute("data-diff",""),e.removeAttribute("data-file")):(e.setAttribute("data-file",""),e.removeAttribute("data-diff")),n){case"bars":case"classic":e.setAttribute("data-indicators",n);break;case"none":e.removeAttribute("data-indicators");break}return r?e.setAttribute("data-disable-line-numbers",""):e.removeAttribute("data-disable-line-numbers"),i?e.removeAttribute("data-background"):e.setAttribute("data-background",""),t==="diff"?e.setAttribute("data-diff-type",s?"split":"single"):e.removeAttribute("data-diff-type"),e.setAttribute("data-overflow",o),e.tabIndex=0,e.style.setProperty("--diffs-min-number-column-width-default",`${`${a}`.length}ch`),e}function ft(e){if(typeof HTMLStyleElement<"u"&&e instanceof HTMLStyleElement)return!0;const t=e.tagName??e.nodeName;return typeof t=="string"&&t.toLowerCase()==="style"}function Wn({shadowRoot:e,currentNode:t,themeCSS:n}){if(n.trim()===""){t?.remove();return}return t??=_n(),t.textContent=n,t.parentNode!==e&&e.appendChild(t),t}function _n(){const e=document.createElement("style");return e.setAttribute(Bt,""),e}if(typeof HTMLElement<"u"&&customElements.get("diffs-container")==null){let e;class t extends HTMLElement{constructor(){if(super(),this.shadowRoot!=null)return;const i=this.attachShadow({mode:"open"});e==null&&(e=new CSSStyleSheet,e.replaceSync(Un)),i.adoptedStyleSheets=[e]}connectedCallback(){Ke(this.shadowRoot??this.attachShadow({mode:"open"}))}}customElements.define(At,t)}class jn extends Yt{constructor(){super(...arguments),this.tokenize=Kn}equals(t,n,i){return i.ignoreWhitespace?((!i.newlineIsToken||!t.includes(`
`))&&(t=t.trim()),(!i.newlineIsToken||!n.includes(`
`))&&(n=n.trim())):i.ignoreNewlineAtEof&&!i.newlineIsToken&&(t.endsWith(`
`)&&(t=t.slice(0,-1)),n.endsWith(`
`)&&(n=n.slice(0,-1))),super.equals(t,n,i)}}const qn=new jn;function ht(e,t,n){return qn.diff(e,t,n)}function Kn(e,t){t.stripTrailingCr&&(e=e.replace(/\r\n/g,`
`));const n=[],i=e.split(/(\n|\r\n)/);i[i.length-1]||i.pop();for(let r=0;r<i.length;r++){const o=i[r];r%2&&!t.newlineIsToken?n[n.length-1]+=o:n.push(o)}return n}function Yn(e){for(let t=0;t<e.length;t++)if(e[t]<" "||e[t]>"~"||e[t]==='"'||e[t]==="\\")return!0;return!1}function q(e){if(!Yn(e))return e;let t='"';const n=new TextEncoder().encode(e);let i=0;for(;i<n.length;){const r=n[i];r===7?t+="\\a":r===8?t+="\\b":r===9?t+="\\t":r===10?t+="\\n":r===11?t+="\\v":r===12?t+="\\f":r===13?t+="\\r":r===34?t+='\\"':r===92?t+="\\\\":r>=32&&r<=126?t+=String.fromCharCode(r):t+="\\"+r.toString(8).padStart(3,"0"),i++}return t+='"',t}const ct={includeIndex:!0,includeUnderline:!0,includeFileHeaders:!0};function ut(e,t,n,i,r,o,s){let a;s?typeof s=="function"?a={callback:s}:a=s:a={},typeof a.context>"u"&&(a.context=4);const l=a.context;if(a.newlineIsToken)throw new Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");if(a.callback){const{callback:h}=a;ht(n,i,Object.assign(Object.assign({},a),{callback:d=>{const c=f(d);h(c)}}))}else return f(ht(n,i,a));function f(h){if(!h)return;h.push({value:"",lines:[]});function d(S){return S.map(function(m){return" "+m})}const c=[];let u=0,p=0,b=[],g=1,v=1;for(let S=0;S<h.length;S++){const m=h[S],y=m.lines||Jn(m.value);if(m.lines=y,m.added||m.removed){if(!u){const x=h[S-1];u=g,p=v,x&&(b=l>0?d(x.lines.slice(-l)):[],u-=b.length,p-=b.length)}for(const x of y)b.push((m.added?"+":"-")+x);m.added?v+=y.length:g+=y.length}else{if(u)if(y.length<=l*2&&S<h.length-2)for(const x of d(y))b.push(x);else{const x=Math.min(y.length,l);for(const N of d(y.slice(0,x)))b.push(N);const k={oldStart:u,oldLines:g-u+x,newStart:p,newLines:v-p+x,lines:b};c.push(k),u=0,p=0,b=[]}g+=y.length,v+=y.length}}for(const S of c)for(let m=0;m<S.lines.length;m++)S.lines[m].endsWith(`
`)?S.lines[m]=S.lines[m].slice(0,-1):(S.lines.splice(m+1,0,"\\ No newline at end of file"),m++);return{oldFileName:e,newFileName:t,oldHeader:r,newHeader:o,hunks:c}}}function Ye(e,t){var n,i,r,o,s,a;if(t||(t=ct),Array.isArray(e)){if(e.length>1&&!t.includeFileHeaders&&!e.every(h=>h.isGit))throw new Error("Cannot omit file headers on a multi-file patch. (The result would be unparseable; how would a tool trying to apply the patch know which changes are to which file?)");return e.map(h=>Ye(h,t)).join(`
`)}const l=[];if(e.isGit){if(t=ct,!e.oldFileName)throw new Error("oldFileName must be specified for Git patches");if(!e.newFileName)throw new Error("newFileName must be specified for Git patches");let h=e.oldFileName,d=e.newFileName;e.isCreate&&h==="/dev/null"?h=d.replace(/^b\//,"a/"):e.isDelete&&d==="/dev/null"&&(d=h.replace(/^a\//,"b/")),l.push("diff --git "+q(h)+" "+q(d)),e.isDelete&&l.push("deleted file mode "+((n=e.oldMode)!==null&&n!==void 0?n:"100644")),e.isCreate&&l.push("new file mode "+((i=e.newMode)!==null&&i!==void 0?i:"100644")),e.oldMode&&e.newMode&&!e.isDelete&&!e.isCreate&&(l.push("old mode "+e.oldMode),l.push("new mode "+e.newMode)),e.isRename&&(l.push("rename from "+q(((r=e.oldFileName)!==null&&r!==void 0?r:"").replace(/^a\//,""))),l.push("rename to "+q(((o=e.newFileName)!==null&&o!==void 0?o:"").replace(/^b\//,"")))),e.isCopy&&(l.push("copy from "+q(((s=e.oldFileName)!==null&&s!==void 0?s:"").replace(/^a\//,""))),l.push("copy to "+q(((a=e.newFileName)!==null&&a!==void 0?a:"").replace(/^b\//,""))))}else t.includeIndex&&e.oldFileName==e.newFileName&&e.oldFileName!==void 0&&l.push("Index: "+e.oldFileName),t.includeUnderline&&l.push("===================================================================");const f=e.hunks.length>0;t.includeFileHeaders&&e.oldFileName!==void 0&&e.newFileName!==void 0&&(!e.isGit||f)&&(l.push("--- "+q(e.oldFileName)+(e.oldHeader?"	"+e.oldHeader:"")),l.push("+++ "+q(e.newFileName)+(e.newHeader?"	"+e.newHeader:"")));for(let h=0;h<e.hunks.length;h++){const d=e.hunks[h],c=d.oldLines===0?d.oldStart-1:d.oldStart,u=d.newLines===0?d.newStart-1:d.newStart;l.push("@@ -"+c+","+d.oldLines+" +"+u+","+d.newLines+" @@");for(const p of d.lines)l.push(p)}return l.join(`
`)+`
`}function Xn(e,t,n,i,r,o,s){if(typeof s=="function"&&(s={callback:s}),s?.callback){const{callback:a}=s;ut(e,t,n,i,r,o,Object.assign(Object.assign({},s),{callback:l=>{a(l?Ye(l,s.headerOptions):void 0)}}))}else{const a=ut(e,t,n,i,r,o,s);return a?Ye(a,s?.headerOptions):void 0}}function Jn(e){const t=e.endsWith(`
`),n=e.split(`
`).map(i=>i+`
`);return t?n.pop():n.push(n.pop().slice(0,-1)),n}function oe(e,t,n,i=!1){const r=Gt(Xn(e.name,t.name,e.contents,t.contents,e.header,t.header,n),{cacheKey:(()=>{if(e.cacheKey!=null&&t.cacheKey!=null)return`${e.cacheKey}:${t.cacheKey}`})(),oldFile:e,newFile:t,throwOnError:i});if(r==null)throw new Error("parseDiffFrom: FileInvalid diff -- probably need to fix something -- if the files are the same maybe?");return t.lang!=null&&(r.lang=t.lang),r}var Qn=class{isDeletionsScrolling=!1;isAdditionsScrolling=!1;timeoutId=-1;codeDeletions;codeAdditions;enabled=!1;cleanUp(){this.enabled&&(this.codeDeletions?.removeEventListener("scroll",this.handleDeletionsScroll),this.codeAdditions?.removeEventListener("scroll",this.handleAdditionsScroll),clearTimeout(this.timeoutId),this.codeDeletions=void 0,this.codeAdditions=void 0,this.enabled=!1)}setup(e,t,n){if(t==null||n==null)for(const i of e.children??[])i instanceof HTMLElement&&("deletions"in i.dataset?t=i:"additions"in i.dataset&&(n=i));if(n==null||t==null){this.cleanUp();return}this.codeDeletions!==t&&(this.codeDeletions?.removeEventListener("scroll",this.handleDeletionsScroll),this.codeDeletions=t,t.addEventListener("scroll",this.handleDeletionsScroll,{passive:!0})),this.codeAdditions!==n&&(this.codeAdditions?.removeEventListener("scroll",this.handleAdditionsScroll),this.codeAdditions=n,n.addEventListener("scroll",this.handleAdditionsScroll,{passive:!0})),this.enabled=!0}handleDeletionsScroll=()=>{this.isAdditionsScrolling||(this.isDeletionsScrolling=!0,clearTimeout(this.timeoutId),this.timeoutId=setTimeout(()=>{this.isDeletionsScrolling=!1},300),this.codeAdditions?.scrollTo({left:this.codeDeletions?.scrollLeft}))};handleAdditionsScroll=()=>{this.isDeletionsScrolling||(this.isAdditionsScrolling=!0,clearTimeout(this.timeoutId),this.timeoutId=setTimeout(()=>{this.isAdditionsScrolling=!1},300),this.codeDeletions?.scrollTo({left:this.codeAdditions?.scrollLeft}))}};function Le(e){return C({tagName:"div",properties:{"data-content-buffer":"","data-buffer-size":e,style:`grid-row: span ${e};min-height:calc(${e} * 1lh)`}})}function we(e){return C({tagName:"div",children:[C({tagName:"span",children:[Y("No newline at end of file")]})],properties:{"data-no-newline":"","data-line-type":e,"data-column-content":""}})}function Oe(e){return C({tagName:"div",children:[Re({name:e==="both"?"diffs-icon-expand-all":"diffs-icon-expand",properties:{"data-icon":""}})],properties:{role:"button","data-expand-button":"","data-expand-both":e==="both"?"":void 0,"data-expand-up":e==="up"?"":void 0,"data-expand-down":e==="down"?"":void 0}})}function ee({type:e,content:t,expandIndex:n,chunked:i=!1,slotName:r,isFirstHunk:o,isLastHunk:s}){let a=0;const l=[];if(e==="metadata"&&t!=null&&l.push(C({tagName:"div",children:[Y(t)],properties:{"data-separator-wrapper":""}})),(e==="line-info"||e==="line-info-basic")&&t!=null){const f=[];n!=null&&(i?(o||(f.push(Oe("up")),a++),s||(f.push(Oe("down")),a++)):(f.push(Oe(!o&&!s?"both":o?"down":"up")),a++)),f.push(C({tagName:"div",children:[C({tagName:"span",children:[Y(t)],properties:{"data-unmodified-lines":""}})],properties:{"data-separator-content":""}})),i&&n!=null&&f.push(C({tagName:"div",children:[Y("Expand all")],properties:{role:"button","data-expand-button":"","data-expand-all-button":""}})),l.push(C({tagName:"div",children:f,properties:{"data-separator-wrapper":"","data-separator-multi-button":a>1?"":void 0}}))}return e==="custom"&&r!=null&&l.push(C({tagName:"slot",properties:{name:r}})),C({tagName:"div",children:l,properties:{"data-separator":l.length===0?"simple":e,"data-expand-index":n,"data-separator-first":o?"":void 0,"data-separator-last":s?"":void 0}})}function Zn(e,t){return`hunk-separator-${e}-${t}`}function ei(e){const t=e.at(-1);return t==null?0:Math.max(t.additionStart+t.additionCount,t.deletionStart+t.deletionCount)}function ti(e){return e.startingLine===0&&e.totalLines===1/0&&e.bufferBefore===0&&e.bufferAfter===0}function ni(e){return e!==""?e.split(Vt):[]}function K(e,t){const n=oe({name:e.prevName??e.name,contents:e.deletionLines.join("")},{name:e.name,contents:e.additionLines.join(""),lang:e.lang},t);return{hunks:n.hunks,splitLineCount:n.splitLineCount,unifiedLineCount:n.unifiedLineCount,additionLines:n.additionLines,deletionLines:n.deletionLines,type:n.type}}function ii(e,t){const n=e.deletionLines.join(""),i=n===`
`?` 
`:`
`,r=oe({name:e.prevName??e.name,contents:n},{name:e.name,contents:i,lang:e.lang},t);return{hunks:r.hunks,splitLineCount:r.splitLineCount,unifiedLineCount:r.unifiedLineCount,additionLines:[""],deletionLines:r.deletionLines,type:r.type}}function ri(e,t,n){if(e.isPartial||e.deletionLines.length!==e.additionLines.length)return $(e,K(e,n));const i=Array.from(t);if(i.length===0)return $(e,{hunks:e.hunks,splitLineCount:e.splitLineCount,unifiedLineCount:e.unifiedLineCount,type:e.type});for(const o of i){const s=e.additionLines[o],a=e.deletionLines[o];if(s==null||a==null||$e(s)===$e(a))return $(e,K(e,n))}const r=oi(e,i);if(r.size===0)return $(e,K(e,n));for(const o of r)if(!ai(e,o,n))return $(e,K(e,n));return hi(e),Xt(e)?$(e,K(e,n)):$(e,{hunks:e.hunks,splitLineCount:e.splitLineCount,unifiedLineCount:e.unifiedLineCount,type:e.type})}function $(e,t){return Object.assign(e,t),t}function oi(e,t){const n=new Set;for(const i of t){const r=si(e,i);if(r==null)return new Set;n.add(r)}return n}function si(e,t){for(const[n,i]of e.hunks.entries()){const r=i.additionLineIndex+i.additionCount;if(t>=i.additionLineIndex&&t<r)return n}}function ai(e,t,n){const i=e.hunks[t];if(i==null)return!1;const r=e.deletionLines.slice(i.deletionLineIndex,i.deletionLineIndex+i.deletionCount),o=e.additionLines.slice(i.additionLineIndex,i.additionLineIndex+i.additionCount),s=oe({name:e.prevName??e.name,contents:r.join("")},{name:e.name,contents:o.join(""),lang:e.lang},{...n,context:0}),a=s.hunks[0];return a==null||s.hunks.length!==1?!1:(di(i,a),li(e,t),!0)}function li(e,t){const n=e.hunks[t];if(n==null)return;if(t!==e.hunks.length-1){n.noEOFCRAdditions=!1,n.noEOFCRDeletions=!1;return}const i=e.additionLines.at(-1),r=e.deletionLines.at(-1);n.noEOFCRAdditions=i!=null&&i!==""&&!i.endsWith(`
`),n.noEOFCRDeletions=r!=null&&r!==""&&!r.endsWith(`
`)}function di(e,t){const n=e.additionLineIndex,i=e.deletionLineIndex;e.hunkContent=t.hunkContent.map(r=>fi(r,n,i)),e.additionLineIndex=n+t.additionLineIndex,e.additionStart=e.additionStart+t.additionLineIndex,e.additionCount=t.additionCount,e.additionLines=t.additionLines,t.deletionLineIndex>=0&&(e.deletionLineIndex=i+t.deletionLineIndex,e.deletionStart=e.deletionStart+t.deletionLineIndex),e.deletionCount=t.deletionCount,e.deletionLines=t.deletionLines,e.noEOFCRAdditions=t.noEOFCRAdditions,e.noEOFCRDeletions=t.noEOFCRDeletions,Ut(e)}function fi(e,t,n){return{...e,additionLineIndex:e.additionLineIndex+t,deletionLineIndex:e.deletionLineIndex+n}}function Ut(e){let t=0,n=0;for(const i of e.hunkContent)i.type==="context"?(t+=i.lines,n+=i.lines):(t+=Math.max(i.additions,i.deletions),n+=i.additions+i.deletions);e.splitLineCount=t,e.unifiedLineCount=n}function hi(e){let t=0,n=0,i=0;for(const r of e.hunks)r.collapsedBefore=Math.max(r.additionStart-1-i,0),r.splitLineStart=t+r.collapsedBefore,r.unifiedLineStart=n+r.collapsedBefore,Ut(r),t+=r.collapsedBefore+r.splitLineCount,n+=r.collapsedBefore+r.unifiedLineCount,i=r.additionStart+r.additionCount-1;if(e.hunks.length>0){const r=e.hunks[e.hunks.length-1],o=Math.max(e.additionLines.length-(r.additionLineIndex+r.additionCount),0);t+=o,n+=o}e.splitLineCount=t,e.unifiedLineCount=n}let ci=-1;var ui=class{options;onRenderUpdate;workerManager;__id=`diff-hunks-renderer:${++ci}`;highlighter;diff;expandedHunks=new Map;deletionAnnotations={};additionAnnotations={};computedLang="text";renderCache;constructor(e={theme:_},t,n){this.options=e,this.onRenderUpdate=t,this.workerManager=n,n?.isWorkingPool()!==!0&&(this.highlighter=Fe(e.theme??_)?Jt():void 0)}cleanUp(){this.recycle(),this.expandedHunks.clear(),this.workerManager=void 0,this.onRenderUpdate=void 0}recycle(){this.highlighter=void 0,this.diff=void 0,this.clearRenderCache(),this.additionAnnotations={},this.deletionAnnotations={},this.workerManager?.cleanUpTasks(this)}getRenderDiff(){return this.renderCache?.diff??this.diff}clearRenderCache(){const e=this.renderCache;this.renderCache=void 0,e!=null&&e.isDirty===!0&&e.diff.cacheKey!=null&&this.workerManager?.evictDiffFromCache(e.diff.cacheKey)}setOptions(e){this.options=e}mergeOptions(e){this.options={...this.options,...e}}expandHunk(e,t,n=this.getOptionsWithDefaults().expansionLineCount){const i={...this.expandedHunks.get(e)??{fromStart:0,fromEnd:0}};(t==="up"||t==="both")&&(i.fromStart+=n),(t==="down"||t==="both")&&(i.fromEnd+=n),this.renderCache?.highlighted!==!0&&this.clearRenderCache(),this.expandedHunks.set(e,i)}getExpandedHunk(e){return this.expandedHunks.get(e)??$t}getExpandedHunksMap(){return this.expandedHunks}setLineAnnotations(e){this.additionAnnotations={},this.deletionAnnotations={};for(const t of e){const n=(()=>{switch(t.side){case"deletions":return this.deletionAnnotations;case"additions":return this.additionAnnotations}})(),i=n[t.lineNumber]??[];n[t.lineNumber]=i,i.push(t)}}updateRenderCache(e,t,n=!1){if(this.renderCache==null)return;const{result:i,diff:r}=this.renderCache;if(i==null)return;if(r.isPartial)throw new Error("Could not update render cache for partial diff");const o=i.code.additionLines,s=[];for(const[a,l]of e){const f=o[a]?.properties??{},h=l.map(p=>p[2]).join(""),d=a<r.additionLines.length,c=d?r.additionLines[a]??"":"",u=$e(c);d&&(r.additionLines[a]=mi(c,h),u!==h&&s.push(a)),o[a]={type:"element",tagName:"div",properties:{"data-line":f["data-line"]??a+1,"data-line-index":f["data-line-index"]??a,"data-line-type":f["data-line-type"]??"context"},children:l.map(([p,b,g])=>p===0&&b===""?g===""?{type:"element",tagName:"br",properties:{},children:[]}:{type:"text",value:g}:{type:"element",tagName:"span",properties:{"data-char":p,style:`--diffs-token-${t}:${b};`},children:[{type:"text",value:g}]})}}!n&&s.length>0&&Object.assign(r,ri(r,s,this.options.parseDiffOptions)),i.baseThemeType=t,this.renderCache.isDirty=!0}applyDocumentChange(e){if(this.renderCache==null)return;const{diff:t,result:n}=this.renderCache;if(n==null)return;t.additionLines=ni(e.getText());const i=t.additionLines.length,r=n.code.additionLines,o=r.length;i<o&&(r.length=i);for(let s=o;s<i;s++)r[s]??=vt(s,e);t.isPartial||(i===0?(Object.assign(t,ii(t,this.options.parseDiffOptions)),r[0]=vt(0,e)):Object.assign(t,K(t,this.options.parseDiffOptions))),this.renderCache.isDirty=!0}getUnifiedLineDecoration({lineType:e}){return{gutterLineType:e,contentProperties:{"data-line-type":e}}}getSplitLineDecoration({side:e,type:t}){const n=t==="change"?e==="deletions"?"change-deletion":"change-addition":t;return{gutterLineType:n,contentProperties:{"data-line-type":n}}}createAnnotationElement=e=>vn(e);getOptionsWithDefaults(){const{diffIndicators:e="bars",diffStyle:t="split",disableBackground:n=!1,disableFileHeader:i=!1,disableLineNumbers:r=!1,disableVirtualizationBuffers:o=!1,collapsed:s=!1,expandUnchanged:a=!1,collapsedContextThreshold:l=1,expansionLineCount:f=100,hunkSeparators:h="line-info",lineDiffType:d="word-alt",maxLineDiffLength:c=1e3,overflow:u="scroll",stickyHeader:p=!1,theme:b=_,headerRenderMode:g="default",tokenizeMaxLineLength:v=1e3,tokenizeMaxLength:S=Wt,useTokenTransformer:m=!1,useCSSClasses:y=!1}=this.options;return{diffIndicators:e,diffStyle:t,disableBackground:n,disableFileHeader:i,disableLineNumbers:r,disableVirtualizationBuffers:o,collapsed:s,expandUnchanged:a,collapsedContextThreshold:l,expansionLineCount:f,hunkSeparators:h,lineDiffType:d,maxLineDiffLength:c,overflow:u,stickyHeader:p,theme:this.workerManager?.getDiffRenderOptions().theme??b,headerRenderMode:g,tokenizeMaxLineLength:v,tokenizeMaxLength:S,useTokenTransformer:m,useCSSClasses:y}}async initializeHighlighter(){return this.highlighter=await Qt(wn(this.computedLang,this.options)),this.highlighter}hydrate(e){if(e==null)return;this.diff=e;const{options:t}=this.getRenderOptions(e),n=Ge(e,this.getTokenizeMaxLength());let i=this.workerManager?.getDiffResultCache(e);i!=null&&!ce(t,i.options)&&(i=void 0),this.renderCache??={diff:e,highlighted:!n&&!We(e),options:t,result:n?void 0:i?.result,renderRange:void 0},this.workerManager?.isWorkingPool()===!0?this.renderCache.result==null&&!n&&this.workerManager.highlightDiffAST(this,this.diff):this.highlighter==null&&(this.computedLang=e.lang??Ie(e.name),this.initializeHighlighter())}getRenderOptions(e){const t=(()=>{if(this.workerManager?.isWorkingPool()===!0)return this.workerManager.getDiffRenderOptions();const{theme:i,tokenizeMaxLineLength:r,lineDiffType:o,maxLineDiffLength:s}=this.getOptionsWithDefaults();return{theme:i,useTokenTransformer:Hn(this.options),tokenizeMaxLineLength:r,lineDiffType:o,maxLineDiffLength:s}})();this.getOptionsWithDefaults();const{renderCache:n}=this;return n?.result==null?{options:t,forceHighlight:!0}:!ue(e,n.diff)||!ce(t,n.options)?{options:t,forceHighlight:!0}:{options:t,forceHighlight:!1}}renderDiff(e=this.renderCache?.diff,t=Qe){if(e==null)return;const{expandUnchanged:n=!1,collapsedContextThreshold:i}=this.getOptionsWithDefaults();let{options:r,forceHighlight:o}=this.getRenderOptions(e);const s=this.getMatchingWorkerResultCache(e,r);s!=null&&!this.hasHighlightedRenderCache(e,r)&&(this.renderCache={diff:e,highlighted:!0,renderRange:void 0,...s},o=!1),this.renderCache??={diff:e,highlighted:!1,options:r,result:void 0,renderRange:void 0};const a=e.additionLines.length>0||e.deletionLines.length>0,l=!a||We(e)||Ge(e,this.getTokenizeMaxLength()),f=!ue(e,this.renderCache.diff),h=!Mt(this.renderCache.renderRange,t);if(this.workerManager?.isWorkingPool()===!0)(l||this.renderCache.result==null||!this.renderCache.highlighted&&(f||h))&&(this.renderCache.diff=e,this.renderCache.options=r,this.renderCache.highlighted=!1,(this.renderCache.result==null||f||h||o)&&(this.renderCache.result=this.workerManager.getPlainDiffAST(e,t.startingLine,t.totalLines,ti(t)||n?!0:this.expandedHunks,i)),this.renderCache.renderRange=t),!l&&a&&(!this.renderCache.highlighted||o)&&this.workerManager.highlightDiffAST(this,e);else{this.computedLang=e.lang??Ie(e.name);const d=this.highlighter!=null&&Fe(r.theme),c=this.highlighter!=null&&at(this.computedLang),u=!l&&c;if(this.highlighter!=null&&d&&(o||l||!this.renderCache.highlighted&&u||this.renderCache.result==null)){const{result:p,options:b}=this.renderDiffWithHighlighter(e,this.highlighter,l||!c);this.renderCache={diff:e,options:b,highlighted:u,result:p,renderRange:void 0}}(!d||!l&&!c)&&this.asyncHighlight(e).then(({result:p,options:b})=>{this.renderCache!=null&&(this.renderCache.highlighted=!1),this.onHighlightSuccess(e,p,b,!l)})}return this.renderCache.result!=null?this.processDiffResult(this.renderCache.diff,t,this.renderCache.result):void 0}async asyncRender(e,t=Qe){const{result:n}=await this.asyncHighlight(e);return this.processDiffResult(e,t,n)}createPreElement(e,t,n){const{diffIndicators:i,disableBackground:r,disableLineNumbers:o,overflow:s}=this.getOptionsWithDefaults();return kn({type:"diff",diffIndicators:i,disableBackground:r,disableLineNumbers:o,overflow:s,split:e,totalLines:t,customProperties:n})}async asyncHighlight(e){const t=Ge(e,this.getTokenizeMaxLength());this.computedLang=t?"text":e.lang??Ie(e.name);const n=this.highlighter!=null&&Fe(this.options.theme??_),i=t||this.highlighter!=null&&at(this.computedLang);return(this.highlighter==null||!n||!i)&&(this.highlighter=await this.initializeHighlighter()),this.renderDiffWithHighlighter(e,this.highlighter,t)}renderDiffWithHighlighter(e,t,n=!1){const{options:i}=this.getRenderOptions(e),{collapsedContextThreshold:r}=this.getOptionsWithDefaults();return{result:Zt(e,t,i,{forcePlainText:n,expandedHunks:n?!0:void 0,collapsedContextThreshold:r}),options:i}}onHighlightSuccess(e,t,n,i=!0){if(this.renderCache==null)return;const r=!this.renderCache.highlighted||!ce(this.renderCache.options,n)||!ue(this.renderCache.diff,e);this.renderCache={diff:e,options:n,highlighted:i,result:t,renderRange:void 0},r&&this.onRenderUpdate?.()}getMatchingWorkerResultCache(e,t){const n=this.workerManager?.getDiffResultCache(e);if(!(n==null||!ce(t,n.options)))return n}hasHighlightedRenderCache(e,t){const{renderCache:n}=this;return n?.result!=null&&n.highlighted&&ue(e,n.diff)&&ce(t,n.options)}onHighlightError(e){console.error(e)}getTokenizeMaxLength(){return this.options.tokenizeMaxLength??1e5}processDiffResult(e,t,{code:n,themeStyles:i,baseThemeType:r}){const{diffStyle:o,disableFileHeader:s,expandUnchanged:a,expansionLineCount:l,collapsedContextThreshold:f,hunkSeparators:h}=this.getOptionsWithDefaults(),d=this.renderCache?.isDirty??!1;this.diff=e;const c=o==="unified";let u=[],p=[],b=[];const g=[],{additionLines:v,deletionLines:S}=n,m={rowCount:0,hunkSeparators:h,additionsContentAST:u,deletionsContentAST:p,unifiedContentAST:b,unifiedGutterAST:ye(),deletionsGutterAST:ye(),additionsGutterAST:ye(),expansionLineCount:l,hunkData:g,incrementRowCount(A=1){m.rowCount+=A},pushToGutter(A,H){switch(A){case"unified":m.unifiedGutterAST.children.push(H);break;case"deletions":m.deletionsGutterAST.children.push(H);break;case"additions":m.additionsGutterAST.children.push(H);break}}},y=en({fileDiff:e,errorPrefix:"DiffHunksRenderer.processDiffResult"}),x={size:0,side:void 0,increment(){this.size+=1},flush(){if(o!=="unified"){if(this.size<=0||this.side==null){this.side=void 0,this.size=0;return}this.side==="additions"?(m.pushToGutter("additions",O(void 0,"buffer",this.size)),u?.push(Le(this.size))):(m.pushToGutter("deletions",O(void 0,"buffer",this.size)),p?.push(Le(this.size))),this.size=0,this.side=void 0}}},k=(A,H,B,j,L)=>{m.pushToGutter(A,tn(H,B,j,L))};function N(A){x.flush(),o==="unified"?Be("unified",A,m):(Be("deletions",A,m),Be("additions",A,m))}this.pushFileLevelAnnotations(e,o,t,m),Te({diff:e,diffStyle:o,startingLine:t.startingLine,totalLines:t.totalLines,expandedHunks:a?!0:this.expandedHunks,collapsedContextThreshold:f,callback:({hunkIndex:A,hunk:H,collapsedBefore:B,collapsedAfter:j,additionLine:L,deletionLine:w,type:T})=>{const U=w!=null?w.splitLineIndex:L.splitLineIndex,X=L!=null?L.unifiedLineIndex:w.unifiedLineIndex;o==="split"&&T!=="change"&&x.flush(),B>0&&N({hunkIndex:A,collapsedLines:B,rangeSize:Math.max(H?.collapsedBefore??0,0),hunkSpecs:H?.hunkSpecs,isFirstHunk:A===0,isLastHunk:!1,isExpandable:!e.isPartial});const ae=o==="unified"?X:U,le={type:T,hunkIndex:A,lineIndex:ae,unifiedLineIndex:X,splitLineIndex:U,deletionLine:w,additionLine:L};if(o==="unified"){const E=this.getUnifiedInjectedRowsForLine?.(le);E?.before!=null&&gt(E.before,m);let R=w!=null?S[w.lineIndex]:void 0,F=L!=null?v[L.lineIndex]:void 0;if(R==null&&F==null){const z="DiffHunksRenderer.processDiffResult: deletionLine and additionLine are null, something is wrong";throw console.error(z,{file:e.name}),new Error(z)}const J=T==="change"?L!=null?"change-addition":"change-deletion":T,G=this.getUnifiedLineDecoration({type:T,lineType:J,additionLineIndex:L?.lineIndex,deletionLineIndex:w?.lineIndex});k("unified",G.gutterLineType,L!=null?L.lineNumber:w.lineNumber,`${X},${U}`,G.gutterProperties),F!=null?F=Ae(F,G.contentProperties,d&&L!=null?{"data-line":L.lineNumber,"data-line-index":`${X},${U}`}:void 0):R!=null&&(R=Ae(R,G.contentProperties,d&&w!=null?{"data-line":w.lineNumber,"data-line-index":`${X},${U}`}:void 0)),Ee({diffStyle:"unified",type:T,deletionLine:R,additionLine:F,unifiedSpan:this.getAnnotations("unified",w?.lineNumber,L?.lineNumber,A,ae),createAnnotationElement:z=>this.createAnnotationElement(z),context:m}),E?.after!=null&&gt(E.after,m)}else{const E=this.getSplitInjectedRowsForLine?.(le);E?.before!=null&&bt(E.before,m,x);let R=w!=null?S[w.lineIndex]:void 0,F=L!=null?v[L.lineIndex]:void 0;const J=this.getSplitLineDecoration({side:"deletions",type:T,lineIndex:w?.lineIndex}),G=this.getSplitLineDecoration({side:"additions",type:T,lineIndex:L?.lineIndex});if(R==null&&F==null){const I="DiffHunksRenderer.processDiffResult: deletionLine and additionLine are null, something is wrong";throw console.error(I,{file:e.name}),new Error(I)}const z=(()=>{if(T==="change"){if(F==null)return"additions";if(R==null)return"deletions"}})();if(z!=null){if(x.side!=null&&x.side!==z)throw new Error("DiffHunksRenderer.processDiffResult: iterateOverDiff, invalid pending splits");x.side=z,x.increment()}const he=this.getAnnotations("split",w?.lineNumber,L?.lineNumber,A,ae);if(he!=null&&x.size>0&&x.flush(),w!=null){const I=Ae(R,J.contentProperties,d?{"data-line":w.lineNumber,"data-line-index":`${w.unifiedLineIndex},${U}`}:void 0);k("deletions",J.gutterLineType,w.lineNumber,`${w.unifiedLineIndex},${U}`,J.gutterProperties),I!=null&&(R=I)}if(L!=null){const I=Ae(F,G.contentProperties,d?{"data-line":L.lineNumber,"data-line-index":`${L.unifiedLineIndex},${U}`}:void 0);k("additions",G.gutterLineType,L.lineNumber,`${L.unifiedLineIndex},${U}`,G.gutterProperties),I!=null&&(F=I)}Ee({diffStyle:"split",type:T,additionLine:F,deletionLine:R,...he,createAnnotationElement:I=>this.createAnnotationElement(I),context:m}),E?.after!=null&&bt(E.after,m,x)}const Se=o==="split"&&H!=null&&U===H.splitLineStart+H.splitLineCount-1,De=Se?H.noEOFCRDeletions:!1,Me=Se?H.noEOFCRAdditions:!1,de=(w?.noEOFCR??!1)||De,fe=(L?.noEOFCR??!1)||Me;if(fe||de){if(o==="split"&&x.flush(),de){const E=T==="context"||T==="context-expanded"?T:"change-deletion";o==="unified"?(m.unifiedContentAST.push(we(E)),m.pushToGutter("unified",O(E,"metadata",1))):(m.deletionsContentAST.push(we(E)),m.pushToGutter("deletions",O(E,"metadata",1)),fe||(m.pushToGutter("additions",O(void 0,"buffer",1)),m.additionsContentAST.push(Le(1))))}if(fe){const E=T==="context"||T==="context-expanded"?T:"change-addition";o==="unified"?(m.unifiedContentAST.push(we(E)),m.pushToGutter("unified",O(E,"metadata",1))):(m.additionsContentAST.push(we(E)),m.pushToGutter("additions",O(E,"metadata",1)),de||(m.pushToGutter("deletions",O(void 0,"buffer",1)),m.deletionsContentAST.push(Le(1))))}m.incrementRowCount(1)}j>0&&h!=="simple"&&N({hunkIndex:T==="context-expanded"?A:A+1,collapsedLines:j,rangeSize:y,hunkSpecs:void 0,isFirstHunk:!1,isLastHunk:!0,isExpandable:!e.isPartial}),m.incrementRowCount(1)}}),o==="split"&&x.flush();const be=Math.max(ei(e.hunks),e.additionLines.length??0,e.deletionLines.length??0),Q=t.bufferBefore>0||t.bufferAfter>0,ve=!c&&e.type!=="deleted",Z=!c&&e.type!=="new",M=m.rowCount>0||Q;u=ve&&M?u:void 0,p=Z&&M?p:void 0,b=c&&M?b:void 0;const se=this.createPreElement(p!=null&&u!=null,be);return{unifiedGutterAST:c&&M?m.unifiedGutterAST.children:void 0,unifiedContentAST:b,deletionsGutterAST:Z&&M?m.deletionsGutterAST.children:void 0,deletionsContentAST:p,additionsGutterAST:ve&&M?m.additionsGutterAST.children:void 0,additionsContentAST:u,hunkData:g,preNode:se,themeStyles:i,baseThemeType:r,headerElement:s?void 0:this.renderHeader(this.diff),totalLines:be,rowCount:m.rowCount,bufferBefore:t.bufferBefore,bufferAfter:t.bufferAfter,css:""}}renderCodeAST(e,t){const n=e==="unified"?t.unifiedGutterAST:e==="deletions"?t.deletionsGutterAST:t.additionsGutterAST,i=e==="unified"?t.unifiedContentAST:e==="deletions"?t.deletionsContentAST:t.additionsContentAST;if(n==null||i==null)return;const r=ye(n);return r.properties.style=`grid-row: span ${t.rowCount}`,[r,Tn(i,t.rowCount)]}renderFullAST(e,t=[]){const n=this.getOptionsWithDefaults().hunkSeparators==="line-info",i=this.renderCodeAST("unified",e);if(i!=null)return t.push(C({tagName:"code",children:i,properties:{"data-code":"","data-container-size":n?"":void 0,"data-unified":""}})),{...e.preNode,children:t};const r=this.renderCodeAST("deletions",e);r!=null&&t.push(C({tagName:"code",children:r,properties:{"data-code":"","data-container-size":n?"":void 0,"data-deletions":""}}));const o=this.renderCodeAST("additions",e);return o!=null&&t.push(C({tagName:"code",children:o,properties:{"data-code":"","data-container-size":n?"":void 0,"data-additions":""}})),{...e.preNode,children:t}}renderFullHTML(e,t=[]){return ie(this.renderFullAST(e,t))}renderPartialHTML(e,t){return t==null?ie(e):ie(C({tagName:"code",children:e,properties:{"data-code":"","data-container-size":this.getOptionsWithDefaults().hunkSeparators==="line-info"?"":void 0,[`data-${t}`]:""}}))}pushFileLevelAnnotations(e,t,n,i){if(!Nt(n))return;const r=e.type!=="new"?pt(lt(this.deletionAnnotations)):[],o=e.type!=="deleted"?pt(lt(this.additionAnnotations)):[];if(r.length===0&&o.length===0)return;const s=-1,a=-1,{createAnnotationElement:l}=this;if(t==="unified"){Ee({diffStyle:t,type:"context",unifiedSpan:{type:"annotation",hunkIndex:s,lineIndex:a,annotations:r.concat(o)},createAnnotationElement:l,context:i});return}Ee({diffStyle:t,type:"context",deletionSpan:{type:"annotation",hunkIndex:s,lineIndex:a,annotations:r},additionSpan:{type:"annotation",hunkIndex:s,lineIndex:a,annotations:o},createAnnotationElement:l,context:i})}getAnnotations(e,t,n,i,r){const o={type:"annotation",hunkIndex:i,lineIndex:r,annotations:[]};if(t!=null)for(const a of this.deletionAnnotations[t]??[])o.annotations.push(re(a));const s={type:"annotation",hunkIndex:i,lineIndex:r,annotations:[]};if(n!=null)for(const a of this.additionAnnotations[n]??[])(e==="unified"?o:s).annotations.push(re(a));if(e==="unified")return o.annotations.length>0?o:void 0;if(!(s.annotations.length===0&&o.annotations.length===0))return{deletionSpan:o,additionSpan:s}}renderHeader(e){const{headerRenderMode:t,stickyHeader:n}=this.getOptionsWithDefaults();return yn({fileOrDiff:e,mode:t,stickyHeader:n})}};function pt(e){return e?.map(t=>re(t))??[]}const pi=new Intl.PluralRules("en-US");function mt(e){return`${e} unmodified line${pi.select(e)==="one"?"":"s"}`}function gt(e,t){for(const n of e)t.unifiedContentAST.push(n.content),t.pushToGutter("unified",n.gutter),t.incrementRowCount(1)}function bt(e,t,n){for(const{deletion:i,addition:r}of e){if(i==null&&r==null)continue;const o=i!=null&&r!=null?void 0:i==null?"deletions":"additions";(o==null||n.side!==o)&&n.flush(),i!=null&&(t.deletionsContentAST.push(i.content),t.pushToGutter("deletions",i.gutter)),r!=null&&(t.additionsContentAST.push(r.content),t.pushToGutter("additions",r.gutter)),o!=null&&(n.side=o,n.increment()),t.incrementRowCount(1)}}function Ee({diffStyle:e,type:t,deletionLine:n,additionLine:i,unifiedSpan:r,deletionSpan:o,additionSpan:s,createAnnotationElement:a,context:l}){let f=!1;if(e==="unified"){if(i!=null?l.unifiedContentAST.push(i):n!=null&&l.unifiedContentAST.push(n),r!=null){const h=t==="change"?n!=null?"change-deletion":"change-addition":t;l.unifiedContentAST.push(a(r)),l.pushToGutter("unified",O(h,"annotation",1)),f=!0}}else if(e==="split"){if(n!=null&&l.deletionsContentAST.push(n),i!=null&&l.additionsContentAST.push(i),o!=null){const h=t==="change"?n!=null?"change-deletion":"context":t;l.deletionsContentAST.push(a(o)),l.pushToGutter("deletions",O(h,"annotation",1)),f=!0}if(s!=null){const h=t==="change"?i!=null?"change-addition":"context":t;l.additionsContentAST.push(a(s)),l.pushToGutter("additions",O(h,"annotation",1)),f=!0}}f&&l.incrementRowCount(1)}function Be(e,{hunkIndex:t,collapsedLines:n,rangeSize:i,hunkSpecs:r,isFirstHunk:o,isLastHunk:s,isExpandable:a},l){if(n<=0)return;const f=e==="unified"?l.unifiedContentAST:e==="deletions"?l.deletionsContentAST:l.additionsContentAST;if(l.hunkSeparators==="metadata"){r!=null&&(l.pushToGutter(e,ee({type:"metadata",content:r,isFirstHunk:o,isLastHunk:s})),f.push(ee({type:"metadata",content:r,isFirstHunk:o,isLastHunk:s})),e!=="additions"&&l.incrementRowCount(1));return}if(l.hunkSeparators==="simple"){t>0&&(l.pushToGutter(e,ee({type:"simple",isFirstHunk:o,isLastHunk:!1})),f.push(ee({type:"simple",isFirstHunk:o,isLastHunk:!1})),e!=="additions"&&l.incrementRowCount(1));return}const h=Zn(e,t),d=i>l.expansionLineCount,c=a?t:void 0;l.pushToGutter(e,ee({type:l.hunkSeparators,content:mt(n),expandIndex:c,chunked:d,slotName:h,isFirstHunk:o,isLastHunk:s})),f.push(ee({type:l.hunkSeparators,content:mt(n),expandIndex:c,chunked:d,slotName:h,isFirstHunk:o,isLastHunk:s})),e!=="additions"&&l.incrementRowCount(1),l.hunkData.push({slotName:h,hunkIndex:t,lines:n,type:e,expandable:a?{up:!o,down:!s,chunked:d}:void 0})}function Ae(e,t,n){return e==null||e.type!=="element"||t==null&&n==null?e:{...e,properties:{...e.properties,...t,...n}}}function vt(e,t){return{type:"element",tagName:"div",properties:{"data-line":e+1,"data-line-index":`${e},${e}`,"data-line-type":"context"},children:[{type:"element",tagName:"span",properties:{"data-char":0},children:[{type:"text",value:t.getLineText(e)}]}]}}function mi(e,t){return e.endsWith(`\r
`)?t+`\r
`:e.endsWith("\r")?t+"\r":e.endsWith(`
`)?t+`
`:t}function Ge(e,t){return Math.max(e.additionLines.length,e.deletionLines.length)>t}function gi(e,t){return e.lineNumber===t.lineNumber&&e.side===t.side&&e.metadata===t.metadata}function bi(e,t){return e.slotName===t.slotName&&e.hunkIndex===t.hunkIndex&&e.lines===t.lines&&e.type===t.type&&e.expandable?.chunked===t.expandable?.chunked&&e.expandable?.up===t.expandable?.up&&e.expandable?.down===t.expandable?.down}function vi(e){return{theme:e?.theme,disableLineNumbers:e?.disableLineNumbers,overflow:e?.overflow,collapsed:e?.collapsed,disableFileHeader:e?.disableFileHeader,disableVirtualizationBuffers:e?.disableVirtualizationBuffers,stickyHeader:e?.stickyHeader,preferredHighlighter:e?.preferredHighlighter,useCSSClasses:e?.useCSSClasses,useTokenTransformer:e?.useTokenTransformer,tokenizeMaxLineLength:e?.tokenizeMaxLineLength,tokenizeMaxLength:e?.tokenizeMaxLength,diffStyle:e?.diffStyle,diffIndicators:e?.diffIndicators,disableBackground:e?.disableBackground,hunkSeparators:typeof e?.hunkSeparators=="function"?"custom":e?.hunkSeparators,expandUnchanged:e?.expandUnchanged,collapsedContextThreshold:e?.collapsedContextThreshold,lineDiffType:e?.lineDiffType,maxLineDiffLength:e?.maxLineDiffLength,expansionLineCount:e?.expansionLineCount,headerRenderMode:e?.renderCustomHeader!=null?"custom":"default"}}let Si=-1;var Ft=class{options;workerManager;isContainerManaged;static LoadedCustomComponent=!0;__id=`file-diff:${++Si}`;type="file-diff";fileContainer;spriteSVG;pre;codeUnified;codeDeletions;codeAdditions;bufferBefore;bufferAfter;themeCSSStyle;appliedThemeCSS;hasAdoptedThemeCSS=!1;unsafeCSSStyle;appliedUnsafeCSS;gutterUtilityContent;headerElement;headerPrefix;headerFilenameSuffix;headerMetadata;headerCustom;separatorCache=new Map;errorWrapper;placeHolder;hunksRenderer;resizeManager;scrollSyncManager;interactionManager;annotationCache=new Map;lineAnnotations=[];managersDirty=!1;deletionFile;additionFile;fileDiff;renderRange;appliedPreAttributes;lastRenderedHeaderHTML;cachedHeaderHTML;lastRowCount;mounted=!1;enabled=!0;editor;fastRefreshTimeout;constructor(e={theme:_},t,n=!1){this.options=e,this.workerManager=t,this.isContainerManaged=n,this.hunksRenderer=this.createHunksRenderer(e),this.resizeManager=new un,this.scrollSyncManager=new Qn,this.interactionManager=new on("diff",nt(e,typeof e.hunkSeparators=="function"||(e.hunkSeparators??"line-info")==="line-info"||e.hunkSeparators==="line-info-basic"?this.handleExpandHunk:void 0,this.getLineIndex)),this.workerManager?.subscribeToThemeChanges(this),this.enabled=!0}handleHighlightRender=()=>{this.rerender()};getHunksRendererOptions(e){return vi(e)}createHunksRenderer(e){return new ui(this.getHunksRendererOptions(e),this.handleHighlightRender,this.workerManager)}getLineIndex=(e,t="additions")=>{const n=this.hunksRenderer.getRenderDiff()??this.fileDiff;if(n==null)return;const i=n.hunks.at(-1);let r,o;e:for(const s of n.hunks){let a=t==="deletions"?s.deletionStart:s.additionStart;const l=t==="deletions"?s.deletionCount:s.additionCount;let f=s.splitLineStart,h=s.unifiedLineStart;if(e<a){const d=a-e;r=Math.max(h-d,0),o=Math.max(f-d,0);break e}if(e>=a+l){if(s===i){const d=e-(a+l);r=h+s.unifiedLineCount+d,o=f+s.splitLineCount+d;break e}continue}for(const d of s.hunkContent)if(d.type==="context")if(e<a+d.lines){const c=e-a;o=f+c,r=h+c;break e}else a+=d.lines,f+=d.lines,h+=d.lines;else{const c=t==="deletions"?d.deletions:d.additions;if(e<a+c){const u=e-a;r=h+(t==="additions"?d.deletions:0)+u,o=f+u;break e}else a+=c,f+=Math.max(d.deletions,d.additions),h+=d.deletions+d.additions}break e}if(!(r==null||o==null))return[r,o]};setOptions(e){e!=null&&(this.options=e,this.cachedHeaderHTML=void 0,this.hunksRenderer.setOptions(this.getHunksRendererOptions(e)),this.syncInteractionOptions())}syncInteractionOptions(){this.interactionManager.setOptions(nt(this.options,typeof this.options.hunkSeparators=="function"||(this.options.hunkSeparators??"line-info")==="line-info"||this.options.hunkSeparators==="line-info-basic"?this.handleExpandHunk:void 0,this.getLineIndex))}mergeOptions(e){this.options={...this.options,...e}}setThemeType(e){(this.options.themeType??"system")!==e&&(this.mergeOptions({themeType:e}),this.applyCachedThemeState(e))}applyCachedThemeState(e){if(typeof this.options.theme=="string"||this.fileContainer==null||this.appliedThemeCSS==null)return!1;const t=this.appliedThemeCSS.baseThemeType??e;return this.appliedThemeCSS.themeType===t?!1:(this.applyThemeState(this.fileContainer,this.appliedThemeCSS.themeStyles,e,this.appliedThemeCSS.baseThemeType),!0)}hasThemeChanged(){return this.appliedThemeCSS!=null&&!Tt(this.appliedThemeCSS.theme,this.options.theme??_)}getHoveredLine=()=>this.interactionManager.getHoveredLine();setLineAnnotations(e){this.lineAnnotations=e}canPartiallyRender(e,t,n){return!(e||t||n||typeof this.options.hunkSeparators=="function")}setSelectedLines(e,t){this.interactionManager.setSelection(e,t)}flushManagers(){if(!this.managersDirty||this.pre==null){this.managersDirty=!1;return}const{diffStyle:e="split",overflow:t="scroll"}=this.options;this.interactionManager.setup(this.pre),this.resizeManager.setup(this.pre,t==="wrap"),t==="scroll"&&e==="split"?this.scrollSyncManager.setup(this.pre,this.codeDeletions,this.codeAdditions):this.scrollSyncManager.cleanUp(),this.managersDirty=!1}cleanUp(e=!1){this.emitPostRender(!0),this.resizeManager.cleanUp(),this.interactionManager.cleanUp(),this.scrollSyncManager.cleanUp(),this.managersDirty=!1,this.workerManager?.unsubscribeToThemeChanges(this),this.renderRange=void 0,this.isContainerManaged||this.fileContainer?.remove(),this.fileContainer=void 0,this.mounted=!1,e||(this.lineAnnotations=[]),this.clearAuxiliaryNodes(),this.annotationCache.clear(),this.pre=void 0,this.codeUnified=void 0,this.codeDeletions=void 0,this.codeAdditions=void 0,this.bufferBefore?.remove(),this.bufferBefore=void 0,this.bufferAfter?.remove(),this.bufferAfter=void 0,this.appliedPreAttributes=void 0,this.headerElement=void 0,this.headerPrefix=void 0,this.headerFilenameSuffix=void 0,this.headerMetadata=void 0,this.headerCustom=void 0,this.placeHolder=void 0,this.lastRenderedHeaderHTML=void 0,e||(this.cachedHeaderHTML=void 0),this.errorWrapper=void 0,this.spriteSVG=void 0,this.lastRowCount=void 0,this.themeCSSStyle=void 0,this.appliedThemeCSS=void 0,this.hasAdoptedThemeCSS=!1,this.unsafeCSSStyle=void 0,this.appliedUnsafeCSS=void 0,e?this.hunksRenderer.recycle():(this.hunksRenderer.cleanUp(),this.workerManager=void 0,this.fileDiff=void 0,this.deletionFile=void 0,this.additionFile=void 0),this.enabled=!1,this.editor?.cleanUp(),this.editor=void 0,this.fastRefreshTimeout!=null&&(clearTimeout(this.fastRefreshTimeout),this.fastRefreshTimeout=void 0)}virtualizedSetup(){this.enabled=!0,this.workerManager?.subscribeToThemeChanges(this)}hydrate(e){const{fileContainer:t,prerenderedHTML:n,preventEmit:i=!1,lineAnnotations:r,oldFile:o,newFile:s,fileDiff:a}=e;this.hydrateElements(t,n),Ci(this.pre,yi({fileDiff:a,oldFile:o,newFile:s}),this.options.collapsed)||ki(this.headerElement,xi({fileDiff:a,oldFile:o,newFile:s}),this.options.disableFileHeader)?this.render({...e,preventEmit:!0}):this.hydrationSetup({fileDiff:a,oldFile:o,newFile:s,lineAnnotations:r}),i||this.emitPostRender()}hydrateElements(e,t){this.fileContainer!==e&&this.emitPostRender(!0),Vn(e,t);for(const n of e.shadowRoot?.children??[]){if(n instanceof SVGElement){this.spriteSVG=n;continue}if(n instanceof HTMLElement){if(n instanceof HTMLPreElement){this.pre=n;for(const i of n.children)!(i instanceof HTMLElement)||i.tagName.toLowerCase()!=="code"||("deletions"in i.dataset&&(this.codeDeletions=i),"additions"in i.dataset&&(this.codeAdditions=i),"unified"in i.dataset&&(this.codeUnified=i));continue}if("diffsHeader"in n.dataset){this.headerElement=n;continue}if(n instanceof HTMLStyleElement&&n.hasAttribute("data-theme-css")){this.themeCSSStyle=n;continue}if(n instanceof HTMLStyleElement&&n.hasAttribute("data-unsafe-css")){this.unsafeCSSStyle=n,this.appliedUnsafeCSS=n.textContent;continue}}}this.pre!=null&&(this.syncCodeNodesFromPre(this.pre),this.pre.removeAttribute("data-dehydrated")),this.fileContainer=e,this.hydrateMeasuredScrollbar()}hydrationSetup({fileDiff:e,oldFile:t,newFile:n,lineAnnotations:i}){this.lineAnnotations=i??this.lineAnnotations,this.additionFile=n,this.deletionFile=t,this.fileDiff=e??(t!=null&&n!=null?oe(t,n,this.options.parseDiffOptions):void 0),this.pre!=null&&(this.syncInteractionOptions(),this.hunksRenderer.hydrate(this.fileDiff),this.renderAnnotations(),this.renderGutterUtility(),this.injectUnsafeCSS(),this.managersDirty=!0,this.flushManagers())}rerender(){!this.enabled||this.fileDiff==null&&this.additionFile==null&&this.deletionFile==null||this.render({forceRender:!0,renderRange:this.renderRange})}onThemeChange(){this.hunksRenderer.clearRenderCache(),this.rerender()}handleExpandHunk=(e,t,n)=>{this.expandHunk(e,t,n)};expandHunk=(e,t,n)=>{this.hunksRenderer.expandHunk(e,t,n),this.rerender()};render({oldFile:e,newFile:t,fileDiff:n,deferManagers:i=!1,forceRender:r=!1,preventEmit:o=!1,lineAnnotations:s,fileContainer:a,containerWrapper:l,renderRange:f}){if(!this.enabled)throw new Error("FileDiff.render: attempting to call render after cleaned up");this.editor?.__postponeBackgroundTokenizeToNextFrame();const{collapsed:h=!1,themeType:d="system"}=this.options,c=h?void 0:f,u=this.hasThemeChanged(),p=e!=null&&t!=null&&(!Ze(e,this.deletionFile)||!Ze(t,this.additionFile));let b=n!=null&&n!==this.fileDiff;const g=s!=null&&(s.length>0||this.lineAnnotations.length>0)?s!==this.lineAnnotations:!1;if(!h&&Mt(c,this.renderRange)&&!r&&!g&&!u&&(n!=null&&n===this.fileDiff||n==null&&!p))return this.applyCachedThemeState(d);const{renderRange:v}=this;if(this.renderRange=c,this.deletionFile=e,this.additionFile=t,n!=null?this.fileDiff=n:e!=null&&t!=null&&p&&(b=!0,this.fileDiff=oe(e,t,this.options.parseDiffOptions)),b&&(this.cachedHeaderHTML=void 0),s!=null&&this.setLineAnnotations(s),this.fileDiff==null)return!1;this.hunksRenderer.setOptions(this.getHunksRendererOptions(this.options)),this.syncInteractionOptions(),this.hunksRenderer.setLineAnnotations(this.lineAnnotations);const{disableErrorHandling:S=!1,disableFileHeader:m=!1}=this.options;if(m&&(this.headerElement!=null&&(this.headerElement.remove(),this.headerElement=void 0,this.lastRenderedHeaderHTML=void 0),this.clearHeaderSlots()),a=this.getOrCreateFileContainer(a,l),this.applyCachedThemeState(d),h){this.removeRenderedCode(),this.clearAuxiliaryNodes();try{const y=this.hunksRenderer.renderDiff(this.fileDiff,_t);y!=null&&this.applyThemeState(a,y.themeStyles,d,y.baseThemeType),y?.headerElement!=null&&this.applyHeaderToDOM(y.headerElement,a),this.renderSeparators([]),this.injectUnsafeCSS()}catch(y){if(S)throw y;console.error(y),y instanceof Error&&this.applyErrorToDOM(y,a)}return o||this.emitPostRender(),!0}try{const y=this.getOrCreatePreNode(a);if(!(this.canPartiallyRender(r,g,p||b||u)&&this.applyPartialRender({previousRenderRange:v,renderRange:c}))){const x=this.hunksRenderer.renderDiff(this.fileDiff,c);if(x==null)return this.workerManager?.isInitialized()===!1&&this.workerManager.initialize().then(()=>this.rerender()),!1;this.applyThemeState(a,x.themeStyles,d,x.baseThemeType),x.headerElement!=null&&this.applyHeaderToDOM(x.headerElement,a),x.additionsContentAST!=null||x.deletionsContentAST!=null||x.unifiedContentAST!=null?this.applyHunksToDOM(y,x):this.pre!=null&&(this.pre.remove(),this.pre=void 0),this.renderSeparators(x.hunkData)}this.applyBuffers(y,c),this.injectUnsafeCSS(),this.renderAnnotations(),this.renderGutterUtility(),this.managersDirty=!0,i||this.flushManagers(),this.editor!=null&&this.syncRenderViewToEditor()}catch(y){if(S)throw y;console.error(y),y instanceof Error&&this.applyErrorToDOM(y,a)}return o||this.emitPostRender(),!0}emitPostRender(e=!1){const{fileContainer:t,options:{onPostRender:n}}=this;if(e){if(!this.mounted||(this.mounted=!1,t==null))return;this.options.onPostRender?.(t,this,"unmount");return}if(t==null)return;const i=this.mounted?"update":"mount";this.mounted=!0,n?.(t,this,i)}syncRenderViewToEditor(){const e=this.editor,t=this.fileContainer,n=this.fileDiff;e!=null&&t!=null&&n!=null&&!n.isPartial&&this.hunksRenderer.initializeHighlighter().then(i=>{e.__syncRenderView(i,t,n,this.lineAnnotations,this.renderRange)})}attachEditor(e){return this.editor?.cleanUp(),this.editor=e,this.interactionManager.setEditorAttached(!0),this.syncRenderViewToEditor(),()=>{this.editor=void 0,this.interactionManager.setEditorAttached(!1)}}applyDocumentChange(e,t){this.hunksRenderer.applyDocumentChange(e);const n=this.hunksRenderer.getRenderDiff();n!=null&&(this.fileDiff=n),this.rerender(),this.interactionManager.setSelectionDirty(),t!==void 0&&t!==this.lineAnnotations&&(this.setLineAnnotations(t),this.hunksRenderer.setLineAnnotations(this.lineAnnotations),this.renderAnnotations())}rerenderFromDocument(e){this.hunksRenderer.applyDocumentChange(e);const t=this.hunksRenderer.getRenderDiff();t!=null&&(this.fileDiff=t),this.hunksRenderer.clearRenderCache(),this.rerender()}updateRenderCache(e,t,n,i){this.hunksRenderer.updateRenderCache(e,t,i),n===!0&&(this.options.diffStyle==="split"?(this.fastRefreshTimeout!=null&&clearTimeout(this.fastRefreshTimeout),this.fastRefreshTimeout=setTimeout(()=>{this.fastRefreshTimeout=void 0,this.fastRefreshDiffView()},100)):this.refreshDiffView())}removeRenderedCode(){this.resizeManager.cleanUp(),this.scrollSyncManager.cleanUp(),this.interactionManager.cleanUp(),this.bufferBefore?.remove(),this.bufferBefore=void 0,this.bufferAfter?.remove(),this.bufferAfter=void 0,this.codeUnified?.remove(),this.codeUnified=void 0,this.codeDeletions?.remove(),this.codeDeletions=void 0,this.codeAdditions?.remove(),this.codeAdditions=void 0,this.pre?.remove(),this.pre=void 0,this.appliedPreAttributes=void 0,this.lastRowCount=void 0}clearAuxiliaryNodes(){for(const{element:e}of this.separatorCache.values())e.remove();this.separatorCache.clear();for(const{element:e}of this.annotationCache.values())e.remove();this.annotationCache.clear(),this.gutterUtilityContent?.remove(),this.gutterUtilityContent=void 0}renderPlaceholder(e){if(this.fileContainer==null)return!1;if(this.emitPostRender(!0),this.cleanChildNodes(),this.placeHolder==null){const t=this.fileContainer.shadowRoot??this.fileContainer.attachShadow({mode:"open"});this.placeHolder=document.createElement("div"),this.placeHolder.dataset.placeholder="",t.appendChild(this.placeHolder)}return this.placeHolder.style.setProperty("height",`${e}px`),!0}primeHighlightCache(){const{fileDiff:e,workerManager:t}=this;if(e==null||t==null||We(e))return;const n=this.options.tokenizeMaxLength??1e5;Math.max(e.additionLines.length,e.deletionLines.length)>n||t.primeDiffHighlightCache(e)}cleanChildNodes(){this.resizeManager.cleanUp(),this.scrollSyncManager.cleanUp(),this.interactionManager.cleanUp(),this.clearAuxiliaryNodes(),this.bufferAfter?.remove(),this.bufferBefore?.remove(),this.codeAdditions?.remove(),this.codeDeletions?.remove(),this.codeUnified?.remove(),this.errorWrapper?.remove(),this.headerElement?.remove(),this.headerPrefix?.remove(),this.headerFilenameSuffix?.remove(),this.headerMetadata?.remove(),this.headerCustom?.remove(),this.pre?.remove(),this.spriteSVG?.remove(),this.themeCSSStyle?.remove(),this.unsafeCSSStyle?.remove(),this.bufferAfter=void 0,this.bufferBefore=void 0,this.codeAdditions=void 0,this.codeDeletions=void 0,this.codeUnified=void 0,this.errorWrapper=void 0,this.headerElement=void 0,this.headerPrefix=void 0,this.headerFilenameSuffix=void 0,this.headerMetadata=void 0,this.headerCustom=void 0,this.pre=void 0,this.spriteSVG=void 0,this.themeCSSStyle=void 0,this.appliedThemeCSS=void 0,this.hasAdoptedThemeCSS=!1,this.unsafeCSSStyle=void 0,this.appliedUnsafeCSS=void 0,this.lastRenderedHeaderHTML=void 0,this.lastRowCount=void 0,this.mounted=!1}renderSeparators(e){const{hunkSeparators:t}=this.options;if(this.isContainerManaged||this.fileContainer==null||typeof t!="function"){for(const{element:i}of this.separatorCache.values())i.remove();this.separatorCache.clear();return}const n=new Map(this.separatorCache);for(const i of e){const r=i.slotName;let o=this.separatorCache.get(r);if(o==null||!bi(i,o.hunkData)){o?.element.remove();const s=document.createElement("div");s.style.display="contents",s.slot=i.slotName;const a=t(i,this);a!=null&&s.appendChild(a),this.fileContainer.appendChild(s),o={element:s,hunkData:i},this.separatorCache.set(r,o)}n.delete(r)}for(const[i,{element:r}]of n.entries())this.separatorCache.delete(i),r.remove()}renderAnnotations(){if(this.isContainerManaged||this.fileContainer==null){for(const{element:n}of this.annotationCache.values())n.remove();this.annotationCache.clear();return}const e=new Map(this.annotationCache),{renderAnnotation:t}=this.options;if(t!=null&&this.lineAnnotations.length>0)for(const[n,i]of this.lineAnnotations.entries()){const r=`${n}-${re(i)}`;let o=this.annotationCache.get(r);if(o==null||!gi(i,o.annotation)){o?.element.remove();const s=t(i);if(s==null)continue;o={element:Nn(re(i)),annotation:i},o.element.appendChild(s),this.fileContainer.appendChild(o.element),this.annotationCache.set(r,o)}e.delete(r)}for(const[n,{element:i}]of e.entries())this.annotationCache.delete(n),i.remove()}renderGutterUtility(){const{renderGutterUtility:e}=this.options;if(this.fileContainer==null||e==null){this.gutterUtilityContent?.remove(),this.gutterUtilityContent=void 0;return}const t=e(this.interactionManager.getHoveredLine);if(t!=null&&this.gutterUtilityContent!=null)return;if(t==null){this.gutterUtilityContent?.remove(),this.gutterUtilityContent=void 0;return}const n=In();n.appendChild(t),this.fileContainer.appendChild(n),this.gutterUtilityContent=n}getOrCreateFileContainer(e,t){const{fileContainer:n}=this,i=e??n??document.createElement("diffs-container"),r=n!==i;return r&&this.emitPostRender(!0),this.fileContainer=i,n!=null&&r&&(this.lastRenderedHeaderHTML=void 0,this.headerElement=void 0),t!=null&&this.fileContainer.parentNode!==t&&t.appendChild(this.fileContainer),r&&this.adoptReusableShellElements(this.fileContainer),this.ensureSpriteSVG(this.fileContainer),this.fileContainer}adoptReusableShellElements(e){const{shadowRoot:t}=e;if(t!=null)for(const n of t.children)n instanceof SVGElement?this.spriteSVG??=n:ft(n)&&n.hasAttribute("data-theme-css")?(this.themeCSSStyle??=n,this.hasAdoptedThemeCSS=!0):ft(n)&&n.hasAttribute("data-unsafe-css")&&(this.unsafeCSSStyle??=n,this.appliedUnsafeCSS??=this.options.unsafeCSS??void 0)}ensureSpriteSVG(e){const t=e.shadowRoot??e.attachShadow({mode:"open"});if(this.spriteSVG==null){const n=document.createElement("div");n.innerHTML=Rn;const i=n.firstChild;i instanceof SVGElement&&(this.spriteSVG=i)}this.spriteSVG!=null&&this.spriteSVG.parentNode!==t&&t.appendChild(this.spriteSVG)}getOrCreatePreNode(e){const t=e.shadowRoot??e.attachShadow({mode:"open"});return this.pre==null?(this.pre=document.createElement("pre"),this.appliedPreAttributes=void 0,this.codeUnified=void 0,this.codeDeletions=void 0,this.codeAdditions=void 0,t.appendChild(this.pre)):this.pre.parentNode!==t&&(t.appendChild(this.pre),this.appliedPreAttributes=void 0),this.placeHolder?.remove(),this.placeHolder=void 0,this.pre}syncCodeNodesFromPre(e){this.codeUnified=void 0,this.codeDeletions=void 0,this.codeAdditions=void 0;for(const t of Array.from(e.children))t instanceof HTMLElement&&(t.hasAttribute("data-unified")?this.codeUnified=t:t.hasAttribute("data-deletions")?this.codeDeletions=t:t.hasAttribute("data-additions")&&(this.codeAdditions=t))}applyHeaderToDOM(e,t){this.cleanupErrorWrapper(),this.placeHolder?.remove(),this.placeHolder=void 0;const{fileDiff:n}=this,i=this.cachedHeaderHTML??ie(e);if(this.cachedHeaderHTML=i,i!==this.lastRenderedHeaderHTML){const d=document.createElement("div");d.innerHTML=i;const c=d.firstElementChild;if(!(c instanceof HTMLElement))return;this.headerElement!=null?t.shadowRoot?.replaceChild(c,this.headerElement):t.shadowRoot?.prepend(c),this.headerElement=c,this.lastRenderedHeaderHTML=i}if(this.isContainerManaged||n==null)return;const{renderCustomHeader:r,renderHeaderPrefix:o,renderHeaderFilenameSuffix:s,renderHeaderMetadata:a}=this.options;if(r!=null){const d=r(n)??void 0;this.headerCustom=this.upsertHeaderSlotElement(t,this.headerCustom,Je,d),this.headerPrefix?.remove(),this.headerFilenameSuffix?.remove(),this.headerMetadata?.remove(),this.headerPrefix=void 0,this.headerFilenameSuffix=void 0,this.headerMetadata=void 0;return}const l=o?.(n)??void 0,f=s?.(n)??void 0,h=a?.(n)??void 0;this.headerPrefix=this.upsertHeaderSlotElement(t,this.headerPrefix,kt,l),this.headerFilenameSuffix=this.upsertHeaderSlotElement(t,this.headerFilenameSuffix,Lt,f),this.headerMetadata=this.upsertHeaderSlotElement(t,this.headerMetadata,wt,h),this.headerCustom?.remove(),this.headerCustom=void 0}clearHeaderSlots(){this.headerPrefix?.remove(),this.headerFilenameSuffix?.remove(),this.headerMetadata?.remove(),this.headerCustom?.remove(),this.headerPrefix=void 0,this.headerFilenameSuffix=void 0,this.headerMetadata=void 0,this.headerCustom=void 0}upsertHeaderSlotElement(e,t,n,i){if(i==null){t?.remove();return}const r=t??this.createHeaderSlotElement(n);return t==null&&e.appendChild(r),this.replaceHeaderSlotContent(r,i),r}replaceHeaderSlotContent(e,t){e.replaceChildren(),t instanceof Element?e.appendChild(t):e.innerText=`${t}`}createHeaderSlotElement(e){const t=document.createElement("div");return t.slot=e,t}injectUnsafeCSS(){const{unsafeCSS:e}=this.options,t=this.fileContainer?.shadowRoot;if(t!=null){if(e==null||e===""){this.unsafeCSSStyle!=null&&(this.unsafeCSSStyle.remove(),this.unsafeCSSStyle=void 0),this.appliedUnsafeCSS=void 0;return}this.unsafeCSSStyle?.parentNode===t&&this.appliedUnsafeCSS===e||(this.unsafeCSSStyle??=Pn(),this.unsafeCSSStyle.parentNode!==t&&t.appendChild(this.unsafeCSSStyle),this.unsafeCSSStyle.textContent=zn(e),this.appliedUnsafeCSS=e)}}applyThemeState(e,t,n,i){const r=e.shadowRoot??e.attachShadow({mode:"open"}),o=i??n,s=this.options.theme??_,a=typeof s=="string"?s:{...s},l=Ke(r);if(this.themeCSSStyle?.parentNode===r&&this.appliedThemeCSS?.themeStyles===t&&this.appliedThemeCSS.themeType===o&&this.appliedThemeCSS.scrollbarGutter===l){this.appliedThemeCSS.theme=a;return}if(this.hasAdoptedThemeCSS&&this.themeCSSStyle?.parentNode===r){this.hasAdoptedThemeCSS=!1,this.appliedThemeCSS={theme:a,themeStyles:t,themeType:o,baseThemeType:i,scrollbarGutter:l};return}this.themeCSSStyle=Wn({shadowRoot:r,currentNode:this.themeCSSStyle,themeCSS:On(t,o,l)}),this.appliedThemeCSS=this.themeCSSStyle!=null?{theme:a,themeStyles:t,themeType:o,baseThemeType:i,scrollbarGutter:l}:void 0}hydrateMeasuredScrollbar(){const e=this.fileContainer?.shadowRoot;e==null||this.themeCSSStyle==null||(this.themeCSSStyle.textContent=Bn(this.themeCSSStyle.textContent??"",Ke(e)))}applyHunksToDOM(e,t){const{overflow:n="scroll"}=this.options,i=(this.options.hunkSeparators??"line-info")==="line-info",r=n==="wrap"?t.rowCount:void 0;this.cleanupErrorWrapper(),this.applyPreNodeAttributes(e,t);let o=!1;const s=[],a=this.hunksRenderer.renderCodeAST("unified",t),l=this.hunksRenderer.renderCodeAST("deletions",t),f=this.hunksRenderer.renderCodeAST("additions",t);a!=null?(o=this.codeUnified==null||this.codeAdditions!=null||this.codeDeletions!=null,this.codeDeletions?.remove(),this.codeDeletions=void 0,this.codeAdditions?.remove(),this.codeAdditions=void 0,this.codeUnified=ze({code:this.codeUnified,columnType:"unified",rowSpan:r,containerSize:i}),this.codeUnified.innerHTML=this.hunksRenderer.renderPartialHTML(a),s.push(this.codeUnified)):l!=null||f!=null?(l!=null?(o=this.codeDeletions==null||this.codeUnified!=null,this.codeUnified?.remove(),this.codeUnified=void 0,this.codeDeletions=ze({code:this.codeDeletions,columnType:"deletions",rowSpan:r,containerSize:i}),this.codeDeletions.innerHTML=this.hunksRenderer.renderPartialHTML(l),s.push(this.codeDeletions)):(this.codeDeletions?.remove(),this.codeDeletions=void 0),f!=null?(o=o||this.codeAdditions==null||this.codeUnified!=null,this.codeUnified?.remove(),this.codeUnified=void 0,this.codeAdditions=ze({code:this.codeAdditions,columnType:"additions",rowSpan:r,containerSize:i}),this.codeAdditions.innerHTML=this.hunksRenderer.renderPartialHTML(f),s.push(this.codeAdditions)):(this.codeAdditions?.remove(),this.codeAdditions=void 0)):(this.codeUnified?.remove(),this.codeUnified=void 0,this.codeDeletions?.remove(),this.codeDeletions=void 0,this.codeAdditions?.remove(),this.codeAdditions=void 0),s.length===0?e.textContent="":o&&e.replaceChildren(...s),this.lastRowCount=t.rowCount}applyPartialRender({previousRenderRange:e,renderRange:t}){const{pre:n,codeUnified:i,codeAdditions:r,codeDeletions:o,options:{diffStyle:s="split"}}=this;if(n==null||e==null||t==null||!Number.isFinite(e.totalLines)||!Number.isFinite(t.totalLines)||this.lastRowCount==null)return!1;const a=this.getCodeColumns(s,i,o,r);if(a==null)return!1;const l=e.startingLine,f=t.startingLine,h=l+e.totalLines,d=f+t.totalLines,c=Math.max(l,f),u=Math.min(h,d);if(u<=c)return!1;const p=Math.max(0,c-l),b=Math.max(0,h-u),g=this.trimColumns({columns:a,trimStart:p,trimEnd:b,previousStart:l,overlapStart:c,overlapEnd:u,diffStyle:s});if(g<0)throw new Error("applyPartialRender: failed to trim to overlap");if(this.lastRowCount<g)throw new Error("applyPartialRender: trimmed beyond DOM row count");let v=this.lastRowCount-g;const S=(k,N)=>{if(!(N<=0||this.fileDiff==null))return this.hunksRenderer.renderDiff(this.fileDiff,{startingLine:k,totalLines:N,bufferBefore:0,bufferAfter:0})},m=S(f,Math.max(c-f,0));if(m==null&&f<c)return!1;const y=S(u,Math.max(d-u,0));if(y==null&&d>u)return!1;const x=(k,N)=>{if(k!=null){if(s==="unified"&&!Array.isArray(a))this.insertPartialHTML(s,a,k,N);else if(s==="split"&&Array.isArray(a))this.insertPartialHTML(s,a,k,N);else throw new Error("FileDiff.applyPartialRender.applyChunk: invalid chunk application");v+=k.rowCount}};return this.cleanupErrorWrapper(),x(m,"afterbegin"),x(y,"beforeend"),this.lastRowCount!==v&&(this.applyRowSpan(s,a,v),this.lastRowCount=v),!0}insertPartialHTML(e,t,n,i){if(e==="unified"&&!Array.isArray(t)){const r=this.hunksRenderer.renderCodeAST("unified",n);this.renderPartialColumn(t,r,i)}else if(e==="split"&&Array.isArray(t)){const r=this.hunksRenderer.renderCodeAST("deletions",n),o=this.hunksRenderer.renderCodeAST("additions",n);this.renderPartialColumn(t[0],r,i),this.renderPartialColumn(t[1],o,i)}else throw new Error("FileDiff.insertPartialHTML: Invalid argument composition")}fastRefreshDiffView(){if(this.options.diffStyle!=="split")return;const e=this.hunksRenderer.renderDiff(this.fileDiff,this.renderRange);if(e==null)return;const t=this.getCodeColumns("split",this.codeUnified,this.codeDeletions,this.codeAdditions);if(!Array.isArray(t))return;const n=(i,r)=>{if(r==null)return;const o=this.hunksRenderer.renderCodeAST(i,e),s=te(o?.[0]),a=te(o?.[1]);for(const[l,f]of[[r.gutter,s],[r.content,a]])if(f!=null&&l.childElementCount===f.length)for(let h=0;h<f.length;h++){const d=l.children[h],c=f[h].properties["data-line-type"];c!=null&&d.dataset.lineType!==c&&(d.dataset.lineType=c)}};n("deletions",t[0]),n("additions",t[1])}refreshDiffView(){const e=this.hunksRenderer.renderDiff(this.fileDiff,this.renderRange);if(e==null)return;const t=this.getCodeColumns(this.options.diffStyle??"split",this.codeUnified,this.codeDeletions,this.codeAdditions);if(t==null)return;const n=(i,r)=>{if(r==null)return;const o=this.hunksRenderer.renderCodeAST(i,e),s=te(o?.[0]),a=te(o?.[1]);for(const[l,f]of[[r.gutter,s],[r.content,a]])f!=null&&(l.innerHTML=ie(f))};Array.isArray(t)?(n("deletions",t[0]),n("additions",t[1])):n("unified",t),this.syncRenderViewToEditor()}renderPartialColumn(e,t,n){if(e==null||t==null)return;const i=te(t[0]),r=te(t[1]);if(i==null||r==null)throw new Error("FileDiff.insertPartialHTML: Unexpected AST structure");const o=r.at(0);n==="beforeend"&&o?.type==="element"&&typeof o.properties["data-buffer-size"]=="number"&&this.mergeBuffersIfNecessary(o.properties["data-buffer-size"],e.content.children[e.content.children.length-1],e.gutter.children[e.gutter.children.length-1],i,r,!0);const s=r.at(-1);n==="afterbegin"&&s?.type==="element"&&typeof s.properties["data-buffer-size"]=="number"&&this.mergeBuffersIfNecessary(s.properties["data-buffer-size"],e.content.children[0],e.gutter.children[0],i,r,!1),e.gutter.insertAdjacentHTML(n,this.hunksRenderer.renderPartialHTML(i)),e.content.insertAdjacentHTML(n,this.hunksRenderer.renderPartialHTML(r))}mergeBuffersIfNecessary(e,t,n,i,r,o){if(!(t instanceof HTMLElement)||!(n instanceof HTMLElement))return;const s=this.getBufferSize(t.dataset);s!=null&&(o?(i.shift(),r.shift()):(i.pop(),r.pop()),this.updateBufferSize(t,s+e),this.updateBufferSize(n,s+e))}applyRowSpan(e,t,n){const i=r=>{r!=null&&(r.gutter.style.setProperty("grid-row",`span ${n}`),r.content.style.setProperty("grid-row",`span ${n}`))};if(e==="unified"&&!Array.isArray(t))i(t);else if(e==="split"&&Array.isArray(t))i(t[0]),i(t[1]);else throw new Error("dun fuuuuked up")}trimColumnRows(e,t,n){let i=0,r=0,o=0,s=!1;const a=n>=0;if(e==null)return 0;const l=Array.from(e.content.children),f=Array.from(e.gutter.children);if(l.length!==f.length)throw new Error("FileDiff.trimColumnRows: columns do not match");for(;o<l.length&&!(t<=0&&!a&&!s);){const h=f[o],d=l[o];if(o++,!(h instanceof HTMLElement)||!(d instanceof HTMLElement))throw console.error({gutterElement:h,contentElement:d}),new Error("FileDiff.trimColumnRows: invalid row elements");if(s&&(s=!1,h.dataset.gutterBuffer==="annotation"&&"lineAnnotation"in d.dataset||h.dataset.gutterBuffer==="metadata"&&"noNewline"in d.dataset)){h.remove(),d.remove(),r++;continue}if("lineIndex"in h.dataset&&"lineIndex"in d.dataset){(t>0||a&&i>=n)&&(h.remove(),d.remove(),t>0&&(t--,t===0&&(s=!0)),r++),i++;continue}if("separator"in h.dataset&&"separator"in d.dataset){(t>0||a&&i>=n)&&(h.remove(),d.remove(),r++);continue}if(h.dataset.gutterBuffer==="annotation"&&"lineAnnotation"in d.dataset){(t>0||a&&i>=n)&&(h.remove(),d.remove(),r++);continue}if(h.dataset.gutterBuffer==="metadata"&&"noNewline"in d.dataset){(t>0||a&&i>=n)&&(h.remove(),d.remove(),r++);continue}if(h.dataset.gutterBuffer==="buffer"&&"contentBuffer"in d.dataset){const c=this.getBufferSize(d.dataset);if(c==null)throw new Error("FileDiff.trimColumnRows: invalid element");if(t>0){const u=Math.min(t,c),p=c-u;p>0?(this.updateBufferSize(h,p),this.updateBufferSize(d,p),r+=u):(h.remove(),d.remove(),r+=c),t-=u,t===0&&p===0&&(s=!0)}else if(a){const u=i,p=i+c-1;if(n<=u)h.remove(),d.remove(),r+=c;else if(n<=p){const b=p-n+1,g=c-b;this.updateBufferSize(h,g),this.updateBufferSize(d,g),r+=b}}i+=c;continue}throw console.error({gutterElement:h,contentElement:d}),new Error("FileDiff.trimColumnRows: unknown row elements")}return r}trimColumns({columns:e,diffStyle:t,overlapEnd:n,overlapStart:i,previousStart:r,trimEnd:o,trimStart:s}){const a=Math.max(0,i-r),l=n-r;if(l<0)throw new Error("FileDiff.trimColumns: overlap ends before previous");const f=s>0,h=o>0;if(!f&&!h)return 0;const d=f?a:0,c=h?l:-1;if(t==="unified"&&!Array.isArray(e))return this.trimColumnRows(e,d,c);if(t==="split"&&Array.isArray(e)){const u=this.trimColumnRows(e[0],d,c),p=this.trimColumnRows(e[1],d,c);if(e[0]!=null&&e[1]!=null&&u!==p)throw new Error("FileDiff.trimColumns: split columns out of sync");return e[0]!=null?u:p}else throw console.error({diffStyle:t,columns:e}),new Error("FileDiff.trimColumns: Invalid columns for diffType")}getBufferSize(e){const t=Number.parseInt(e?.bufferSize??"",10);return Number.isNaN(t)?void 0:t}updateBufferSize(e,t){e.dataset.bufferSize=`${t}`,e.style.setProperty("grid-row",`span ${t}`),e.style.setProperty("min-height",`calc(${t} * 1lh)`)}getCodeColumns(e,t,n,i){function r(o){if(o==null)return;const s=o.children[0],a=o.children[1];if(!(!(s instanceof HTMLElement)||!(a instanceof HTMLElement)||s.dataset.gutter==null||a.dataset.content==null))return{gutter:s,content:a}}if(e==="unified")return r(t);{const o=r(n),s=r(i);return o!=null||s!=null?[o,s]:void 0}}updateBuffers(e){this.pre!=null&&this.applyBuffers(this.pre,e)}applyBuffers(e,t){if(t==null||this.shouldDisableVirtualizationBuffers()){this.bufferBefore!=null&&(this.bufferBefore.remove(),this.bufferBefore=void 0),this.bufferAfter!=null&&(this.bufferAfter.remove(),this.bufferAfter=void 0);return}t.bufferBefore>0?(this.bufferBefore==null&&(this.bufferBefore=document.createElement("div"),this.bufferBefore.dataset.virtualizerBuffer="before",e.before(this.bufferBefore)),this.bufferBefore.style.setProperty("height",`${t.bufferBefore}px`),this.bufferBefore.style.setProperty("contain","strict")):this.bufferBefore!=null&&(this.bufferBefore.remove(),this.bufferBefore=void 0),t.bufferAfter>0?(this.bufferAfter==null&&(this.bufferAfter=document.createElement("div"),this.bufferAfter.dataset.virtualizerBuffer="after",e.after(this.bufferAfter)),this.bufferAfter.style.setProperty("height",`${t.bufferAfter}px`),this.bufferAfter.style.setProperty("contain","strict")):this.bufferAfter!=null&&(this.bufferAfter.remove(),this.bufferAfter=void 0)}shouldDisableVirtualizationBuffers(){return this.options.disableVirtualizationBuffers??!1}applyPreNodeAttributes(e,{additionsContentAST:t,deletionsContentAST:n,totalLines:i},r){const{diffIndicators:o="bars",disableBackground:s=!1,disableLineNumbers:a=!1,overflow:l="scroll",diffStyle:f="split"}=this.options,h={type:"diff",diffIndicators:o,disableBackground:s,disableLineNumbers:a,overflow:l,split:f==="unified"?!1:t!=null&&n!=null,totalLines:i,customProperties:r};Dn(h,this.appliedPreAttributes)||($n(e,h),this.appliedPreAttributes=h)}applyErrorToDOM(e,t){this.cleanupErrorWrapper(),this.pre?.remove(),this.pre=void 0,this.appliedPreAttributes=void 0;const n=t.shadowRoot??t.attachShadow({mode:"open"});this.errorWrapper??=document.createElement("div"),this.errorWrapper.dataset.errorWrapper="",this.errorWrapper.textContent="",n.appendChild(this.errorWrapper);const i=document.createElement("div");i.dataset.errorMessage="",i.innerText=e.message,this.errorWrapper.appendChild(i);const r=document.createElement("pre");r.dataset.errorStack="",r.innerText=e.stack??"No Error Stack",this.errorWrapper.appendChild(r)}cleanupErrorWrapper(){this.errorWrapper?.remove(),this.errorWrapper=void 0}};function yi({fileDiff:e,oldFile:t,newFile:n}){return e!=null&&e.hunks.length>0||t!=null||n!=null}function xi({fileDiff:e,oldFile:t,newFile:n}){return e!=null||t!=null||n!=null}function Ci(e,t,n=!1){return!n&&e==null&&t}function ki(e,t,n=!1){return e==null&&t&&!n}function te(e){if(!(e==null||e.type!=="element"))return e.children??[]}function Li({fileDiff:e,metrics:t,disableFileHeader:n,hunkSeparators:i,expandUnchanged:r,expandedHunks:o,collapsedContextThreshold:s}){let a=ne(t,n),l=a;const f=r?!0:o,h=e.hunks.length-1;for(let d=0;d<e.hunks.length;d++){const c=e.hunks[d];if(c==null)throw new Error("computeEstimatedDiffHeights: invalid hunk index");const u=_e({isPartial:e.isPartial,rangeSize:c.collapsedBefore,expandedHunks:f,hunkIndex:d,collapsedContextThreshold:s}),p=(u.fromStart+u.fromEnd)*t.lineHeight;if(a+=p,l+=p,u.collapsedLines>0){const v=pe({type:i,metrics:t,hunkIndex:d,hunkSpecs:c.hunkSpecs})?.totalHeight??0;a+=v,l+=v}a+=c.splitLineCount*t.lineHeight,l+=c.unifiedLineCount*t.lineHeight;const b=wi(c);a+=b.split*t.lineHeight,l+=b.unified*t.lineHeight;const g=d===h?je({fileDiff:e,hunkIndex:d,expandedHunks:f,collapsedContextThreshold:s,errorPrefix:"computeEstimatedDiffHeights"}):void 0;if(g!=null){const v=(g.fromStart+g.fromEnd)*t.lineHeight;if(a+=v,l+=v,g.collapsedLines>0){const S=me({type:i,metrics:t})?.totalHeight??0;a+=S,l+=S}}}if(e.hunks.length>0){const d=Rt(t);a+=d,l+=d}return{splitHeight:a,unifiedHeight:l}}function wi(e){if(!e.noEOFCRAdditions&&!e.noEOFCRDeletions)return{split:0,unified:0};const t=e.hunkContent.at(-1);if(t==null)return{split:0,unified:0};if(t.type==="context"){const n=t.lines>0?1:0;return{split:n,unified:n}}return Ei(e,t)}function Ei(e,t){const n=(t.deletions>0&&e.noEOFCRDeletions?1:0)+(t.additions>0&&e.noEOFCRAdditions?1:0),i=t.deletions>0&&e.noEOFCRDeletions,r=t.additions>0&&e.noEOFCRAdditions;return{split:i||r?1:0,unified:n}}const Xe=5e3;let Ai=-1;var Ti=class extends Ft{__id=`little-virtualized-file-diff:${++Ai}`;top;height=0;metrics;cache={heightDeltas:new Map,measuredHeightDeltaTotal:0,estimatedSplitHeight:void 0,estimatedUnifiedHeight:void 0,checkpoints:[],totalLines:0,fileAnnotationHeight:0};isVisible=!1;isSetup=!1;virtualizer;layoutDirty=!0;forceRenderOverride;currentCollapsed;constructor(e,t,n,i,r=!1){super(e,i,r),this.virtualizer=t,this.metrics=Pe(n)}setMetrics(e,t=!1){const n=Pe(e);!t&&qe(this.metrics,n)||(this.metrics=n,this.resetLayoutCache({includeEstimatedHeights:!0}))}setLineAnnotations(e){this.syncLineAnnotations(e)&&this.resetLayoutCache({includeEstimatedHeights:!1})}syncLineAnnotations(e){return e==null||e===this.lineAnnotations||e.length===0&&this.lineAnnotations.length===0?!1:(super.setLineAnnotations(e),!0)}setFileAnnotationHeight(e){const t=this.cache.fileAnnotationHeight;return e===t?!1:(this.cache.fileAnnotationHeight=e,this.cache.measuredHeightDeltaTotal+=e-t,!0)}hasFileAnnotations(e=this.fileDiff){return e==null||!An(this.lineAnnotations)?!1:this.lineAnnotations.some(t=>t.lineNumber!==0?!1:e.type==="new"?t.side==="additions":e.type==="deleted"?t.side==="deletions":!0)}getLineHeight(e,t=!1){return this.getEstimatedLineHeight(t)+(this.cache.heightDeltas.get(e)??0)}getEstimatedLineHeight(e=!1){const t=e?2:1;return this.metrics.lineHeight*t}setOptions(e){if(this.isAdvancedMode())throw new Error("VirtualizedFileDiff.setOptions cannot be used inside CodeView. Update CodeView options instead.");if(e==null)return;const{options:t}=this,n=!Dt(t,e),i=n&&Ii(t,e);super.setOptions(e),i&&this.resetLayoutCache({forceSimpleRecompute:!0,includeEstimatedHeights:Pi(t,e)}),n&&(this.forceRenderOverride=!0),n&&this.isSimpleMode()&&this.virtualizer.instanceChanged(this,i)}setThemeType(e){if(this.isAdvancedMode())throw new Error("VirtualizedFileDiff.setThemeType cannot be used inside CodeView. Update CodeView options instead.");super.setThemeType(e)}resetLayoutCache({forceSimpleRecompute:e=!1,includeEstimatedHeights:t=!1}={}){this.layoutDirty=!0,this.cache.fileAnnotationHeight=0,this.cache.heightDeltas.size>0&&this.cache.heightDeltas.clear(),this.cache.measuredHeightDeltaTotal!==0&&(this.cache.measuredHeightDeltaTotal=0),this.cache.checkpoints.length>0&&(this.cache.checkpoints.length=0),this.cache.totalLines!==0&&(this.cache.totalLines=0),t&&(this.cache.estimatedSplitHeight=void 0,this.cache.estimatedUnifiedHeight=void 0),this.renderRange!=null&&(this.renderRange=void 0),e&&this.isSimpleMode()&&this.computeApproximateSize()}reconcileHeights(){let e=!1;const{overflow:t="scroll"}=this.options;if(this.fileContainer==null||this.fileDiff==null)return this.height!==0&&(e=!0),this.height=0,e;if(this.top=this.getVirtualizedTop(),t==="scroll"&&this.lineAnnotations.length===0&&!this.isResizeDebuggingEnabled())return e;const n=this.getDiffStyle(),i=n==="split"?[this.codeDeletions,this.codeAdditions]:[this.codeUnified],r=this.hasFileAnnotations(this.fileDiff);if(this.renderRange!=null&&r&&Nt(this.renderRange)){const o=Hi(i)??0;this.setFileAnnotationHeight(o)&&(e=!0)}else!r&&this.setFileAnnotationHeight(0)&&(e=!0);for(const o of i){if(o==null)continue;const s=o.children[1];if(s instanceof HTMLElement)for(const a of s.children){if(!(a instanceof HTMLElement))continue;const l=a.dataset.lineIndex;if(l==null)continue;const f=Fi(l,n);let h=a.getBoundingClientRect().height,d=!1;a.nextElementSibling instanceof HTMLElement&&("lineAnnotation"in a.nextElementSibling.dataset||"noNewline"in a.nextElementSibling.dataset)&&("noNewline"in a.nextElementSibling.dataset&&(d=!0),h+=a.nextElementSibling.getBoundingClientRect().height);const c=this.getEstimatedLineHeight(d),u=this.cache.heightDeltas.get(f)??0,p=h-c;p!==u&&(e=!0,this.cache.measuredHeightDeltaTotal+=p-u,p===0?this.cache.heightDeltas.delete(f):this.cache.heightDeltas.set(f,p))}}return(e||this.isResizeDebuggingEnabled())&&this.computeApproximateSize(!0),e}onRender=e=>this.fileContainer==null?!1:(e&&(this.top=this.getVirtualizedTop()),this.render());prepareCodeViewItem(e,t,n,i){const r=!ue(this.fileDiff,e),o=this.syncLineAnnotations(i);let s=n?.resetDiffLayoutCache===!0||r||o,a=r||n?.resetDiffLayoutCache===!0&&n.includeEstimatedDiffHeights;n?.metrics!=null&&(this.metrics=Pe(n.metrics),s=!0,a=!0);const{collapsed:l=!1}=this.options;return this.currentCollapsed!==l&&(this.currentCollapsed=l,s=!0),s&&this.resetLayoutCache({includeEstimatedHeights:a}),this.fileDiff=e,this.top=t,this.computeApproximateSize(),this.height}getLinePosition(e,t="additions"){if(this.fileDiff==null||e<1)return;const n=this.getLineIndex(e,t);if(n==null)return;const{disableFileHeader:i=!1,expandUnchanged:r=!1,collapsed:o=!1,collapsedContextThreshold:s=1}=this.options,a=this.getDiffStyle(),l=this.getHunkSeparatorType(),f=a==="split"?n[1]:n[0];this.approximateLayoutCheckpoints();const h=ne(this.metrics,i),d=this.getLayoutCheckpointBeforeLineIndex(f);let c=d?.top??h+this.cache.fileAnnotationHeight;if(o)return{top:h,height:0};let u;return Te({diff:this.fileDiff,diffStyle:a,startingLine:d?.renderedLineIndex??0,expandedHunks:r?!0:this.hunksRenderer.getExpandedHunksMap(),collapsedContextThreshold:s,callback:({hunkIndex:p,hunk:b,collapsedBefore:g,collapsedAfter:v,deletionLine:S,additionLine:m})=>{const y=a==="split"?m?.splitLineIndex??S?.splitLineIndex:m?.unifiedLineIndex??S?.unifiedLineIndex;if(y==null)throw new Error("VirtualizedFileDiff.getLinePosition: missing line index data");if(g>0){const k=pe({type:l,metrics:this.metrics,hunkIndex:p,hunkSpecs:b?.hunkSpecs});if(k!=null){if(c+=k.gapBefore,f>=y-g&&f<y)return u={top:c,height:k.height},!0;c+=k.height+k.gapAfter}}const x=this.getLineHeight(y,(m?.noEOFCR??!1)||(S?.noEOFCR??!1));if(y===f)return u={top:c,height:x},!0;if(c+=x,v>0){const k=me({type:l,metrics:this.metrics});if(k!=null){if(f>y&&f<=y+v)return u={top:c+k.gapBefore,height:k.height},!0;c+=k.totalHeight}}return!1}}),u}getNumericScrollAnchor(e){if(this.fileDiff==null)return;const{disableFileHeader:t=!1,expandUnchanged:n=!1,collapsed:i=!1,collapsedContextThreshold:r=1}=this.options;if(i)return;const o=this.getDiffStyle(),s=this.getHunkSeparatorType();this.approximateLayoutCheckpoints();const a=this.getLayoutCheckpointBeforeTop(e);let l=a?.top??ne(this.metrics,t)+this.cache.fileAnnotationHeight,f;return Te({diff:this.fileDiff,diffStyle:o,startingLine:a?.renderedLineIndex??0,expandedHunks:n?!0:this.hunksRenderer.getExpandedHunksMap(),collapsedContextThreshold:r,callback:({hunkIndex:h,hunk:d,collapsedBefore:c,collapsedAfter:u,deletionLine:p,additionLine:b})=>{const g=o==="split"?b?.splitLineIndex??p?.splitLineIndex:b?.unifiedLineIndex??p?.unifiedLineIndex;if(g==null)throw new Error("VirtualizedFileDiff.getNumericScrollAnchor: missing line index data");if(c>0){const S=pe({type:s,metrics:this.metrics,hunkIndex:h,hunkSpecs:d?.hunkSpecs});S!=null&&(l+=S.totalHeight)}if(l>=e&&(p!=null?f={lineNumber:p.lineNumber,side:"deletions",top:l}:b!=null&&(f={lineNumber:b.lineNumber,side:"additions",top:l}),f!=null))return!0;const v=this.getLineHeight(g,(b?.noEOFCR??!1)||(p?.noEOFCR??!1));if(l+=v,u>0){const S=me({type:s,metrics:this.metrics});S!=null&&(l+=S.totalHeight)}return!1}}),f}getVirtualizedHeight(){return this.height}getAdvancedStickySpecs(e){if(this.top==null||this.fileDiff==null)return;if(this.options.collapsed===!0)return{topOffset:this.top,height:this.height};const t=e!=null?this.computeRenderRangeFromWindow(this.fileDiff,this.top,e):this.renderRange;if(t==null)return;const{bufferBefore:n,bufferAfter:i,totalLines:r}=t;let o=0;if(r===0){const s=e??this.virtualizer.getWindowSpecs();this.top<s.top&&(o=i)}return{topOffset:this.top+n+o,height:this.height-(n+i)}}cleanUp(e=!1){this.fileContainer!=null&&this.isSimpleMode()&&this.getSimpleVirtualizer()?.disconnect(this.fileContainer),e||this.resetLayoutCache({includeEstimatedHeights:!0}),this.isSetup=!1,super.cleanUp(e)}expandHunk=(e,t,n)=>{this.hunksRenderer.expandHunk(e,t,n),this.forceRenderOverride=!0,this.resetLayoutCache({includeEstimatedHeights:!0}),this.isSimpleMode()&&this.computeApproximateSize(),this.virtualizer.instanceChanged(this,!0)};setVisibility(e){this.isAdvancedMode()||this.fileContainer==null||(this.renderRange=void 0,e&&!this.isVisible?(this.top=this.getVirtualizedTop(),this.isVisible=!0):!e&&this.isVisible&&(this.isVisible=!1,this.rerender()))}rerender(){!this.enabled||this.fileDiff==null&&this.additionFile==null&&this.deletionFile==null||(this.forceRenderOverride=!0,this.virtualizer.instanceChanged(this,!1))}applyDocumentChange(e,t,n=!1){const i=this.renderRange;if(super.applyDocumentChange(e,t),this.getSimpleVirtualizer()?.markDOMDirty(),this.resetLayoutCache({forceSimpleRecompute:this.isSimpleMode(),includeEstimatedHeights:!0}),n&&i!==void 0&&this.fileDiff!==void 0){const r=this.virtualizer.getWindowSpecs(),o=this.computeRenderRangeFromWindow(this.fileDiff,this.top??0,r);o.bufferAfter!==i.bufferAfter&&this.updateBuffers(o)}}computeApproximateSize(e=!1){const t=this.isResizeDebuggingEnabled();if(!e&&!this.layoutDirty&&!t)return;const n=this.height===0;if(this.height=0,this.cache.checkpoints=[],this.cache.totalLines=0,this.fileDiff==null){this.layoutDirty=!1;return}const{disableFileHeader:i=!1,collapsed:r=!1}=this.options,o=ne(this.metrics,i);if(this.height+=o,r){this.layoutDirty=!1;return}this.height=this.getActiveEstimatedHeight()+this.cache.measuredHeightDeltaTotal,t&&!n&&this.validateComputedHeight(),this.layoutDirty=!1}getActiveEstimatedHeight(){this.ensureEstimatedDiffHeights();const e=this.getDiffStyle()==="split"?this.cache.estimatedSplitHeight:this.cache.estimatedUnifiedHeight;if(e==null)throw new Error("VirtualizedFileDiff.getActiveEstimatedHeight: missing estimated height");return e}ensureEstimatedDiffHeights(){if(this.fileDiff==null){this.cache.estimatedSplitHeight=void 0,this.cache.estimatedUnifiedHeight=void 0;return}if(this.cache.estimatedSplitHeight!=null&&this.cache.estimatedUnifiedHeight!=null)return;const{disableFileHeader:e=!1,expandUnchanged:t=!1,collapsedContextThreshold:n=1}=this.options,{splitHeight:i,unifiedHeight:r}=Li({fileDiff:this.fileDiff,metrics:this.metrics,disableFileHeader:e,hunkSeparators:this.getHunkSeparatorType(),expandUnchanged:t,expandedHunks:this.hunksRenderer.getExpandedHunksMap(),collapsedContextThreshold:n});this.cache.estimatedSplitHeight=i,this.cache.estimatedUnifiedHeight=r}validateComputedHeight(){if(this.fileContainer==null||this.fileDiff==null)return;const e=this.fileContainer.getBoundingClientRect();e.height!==this.height?console.log("VirtualizedFileDiff.computeApproximateSize: computed height doesnt match",{name:this.fileDiff.name,elementHeight:e.height,computedHeight:this.height}):console.log("VirtualizedFileDiff.computeApproximateSize: computed height IS CORRECT")}render({fileContainer:e,oldFile:t,newFile:n,fileDiff:i,forceRender:r=!1,lineAnnotations:o,...s}={}){const{forceRenderOverride:a,isSetup:l}=this;this.forceRenderOverride=void 0;const f=this.syncLineAnnotations(o);if(f&&this.resetLayoutCache({includeEstimatedHeights:!1}),this.fileDiff??=i??(t!=null&&n!=null?oe(t,n,this.options.parseDiffOptions):void 0),e=this.getOrCreateFileContainer(e),this.fileDiff==null)return console.error("VirtualizedFileDiff.render: attempting to virtually render when we dont have the correct data"),!1;if(l)this.top??=this.getVirtualizedTop();else{this.computeApproximateSize();const u=this.getSimpleVirtualizer();if(this.top??=this.getVirtualizedTop(),this.isAdvancedMode())this.isVisible=!0;else{if(u==null)throw new Error("VirtualizedFileDiff.render: simple virtualizer is not available");u.connect(e,this),this.isVisible=u.isInstanceVisible(this.top??0,this.height)}this.isSetup=!0}if(!this.isVisible&&this.isSimpleMode())return this.renderPlaceholder(this.height);const h=this.virtualizer.getWindowSpecs(),d=this.top??0,c=this.computeRenderRangeFromWindow(this.fileDiff,d,h);return super.render({fileDiff:this.fileDiff,fileContainer:e,renderRange:c,oldFile:t,newFile:n,lineAnnotations:o,forceRender:(a??r)||f,...s})}syncVirtualizedTop(){this.top=this.getVirtualizedTop()}shouldDisableVirtualizationBuffers(){return this.isAdvancedMode()||super.shouldDisableVirtualizationBuffers()}isSimpleMode(){return this.virtualizer.type==="simple"}isAdvancedMode(){return this.virtualizer.type==="advanced"}getVirtualizedTop(){return this.virtualizer.type==="advanced"?this.virtualizer.getLocalTopForInstance(this):this.fileContainer!=null?this.virtualizer.getOffsetInScrollContainer(this.fileContainer):0}getSimpleVirtualizer(){return this.virtualizer.type==="simple"?this.virtualizer:void 0}isResizeDebuggingEnabled(){return this.getSimpleVirtualizer()?.config.resizeDebugging??!1}getDiffStyle(){return this.options.diffStyle??"split"}getHunkSeparatorType(){return Ui(this.options.hunkSeparators)}approximateLayoutCheckpoints(){if(this.cache.checkpoints.length>0||this.fileDiff==null||this.fileDiff.hunks.length===0||this.options.collapsed===!0)return;const{disableFileHeader:e=!1,expandUnchanged:t=!1,collapsedContextThreshold:n=1}=this.options,i=this.fileDiff.hunks.length-1,r=this.getDiffStyle(),o=this.getHunkSeparatorType(),s=t?!0:this.hunksRenderer.getExpandedHunksMap(),a=Ri(this.cache.heightDeltas);let l=ne(this.metrics,e)+this.cache.fileAnnotationHeight,f=0;const h=({rowCount:d,startLineIndex:c,preSeparatorHeight:u=0,postSeparatorHeight:p=0,metadataOffsets:b=[]})=>{if(d<=0)return;const g=f,v=f+d;let S=Di(g);for(;S<v;){const m=S-g,y=l+(m>0?u:0)+m*this.metrics.lineHeight+Mi(b,m)*this.metrics.lineHeight+St(a,c,c+m);this.cache.checkpoints.push({renderedLineIndex:S,lineIndex:c+m,top:y}),S+=Xe}l+=u+d*this.metrics.lineHeight+b.length*this.metrics.lineHeight+St(a,c,c+d)+p,f=v};for(let d=0;d<this.fileDiff.hunks.length;d++){const c=this.fileDiff.hunks[d];if(c==null)throw new Error("VirtualizedFileDiff.approximateLayoutCheckpoints: invalid hunk index");const u=_e({isPartial:this.fileDiff.isPartial,rangeSize:c.collapsedBefore,expandedHunks:s,hunkIndex:d,collapsedContextThreshold:n}),p=u.collapsedLines>0?pe({type:o,metrics:this.metrics,hunkIndex:d,hunkSpecs:c.hunkSpecs})?.totalHeight??0:0;h({rowCount:u.fromStart,startLineIndex:(r==="split"?c.splitLineStart:c.unifiedLineStart)-u.rangeSize});let b=p;h({rowCount:u.fromEnd,startLineIndex:(r==="split"?c.splitLineStart:c.unifiedLineStart)-u.fromEnd,preSeparatorHeight:b}),u.fromEnd>0&&(b=0);const g=d===i?je({fileDiff:this.fileDiff,hunkIndex:d,expandedHunks:s,collapsedContextThreshold:n,errorPrefix:"VirtualizedFileDiff"}):void 0,v=g!=null&&g.collapsedLines>0?me({type:o,metrics:this.metrics})?.totalHeight??0:0,S=g!=null?g.fromStart+g.fromEnd:0,m=r==="split"?c.splitLineCount:c.unifiedLineCount,y=r==="split"?c.splitLineStart:c.unifiedLineStart;h({rowCount:m,startLineIndex:y,preSeparatorHeight:b,postSeparatorHeight:S===0?v:0,metadataOffsets:Ni({diffStyle:r,hunk:c,rowCount:m})}),g!=null&&S>0&&h({rowCount:S,startLineIndex:y+m,postSeparatorHeight:v})}this.cache.totalLines=f}getLayoutCheckpointBeforeLineIndex(e){if(e<=0||this.cache.checkpoints.length===0)return;let t=0,n=this.cache.checkpoints.length-1,i;for(;t<=n;){const r=t+n>>1,o=this.cache.checkpoints[r];if(o==null)throw new Error("VirtualizedFileDiff: invalid checkpoint index");o.lineIndex<=e?(i=o,t=r+1):n=r-1}return i}getLayoutCheckpointBeforeTop(e,t){let n=0,i=this.cache.checkpoints.length-1,r=-1;for(;n<=i;){const o=n+i>>1,s=this.cache.checkpoints[o];if(s==null)throw new Error("VirtualizedFileDiff: invalid checkpoint index");s.top<=e?(r=o,n=o+1):i=o-1}if(t==null)return r>=0?this.cache.checkpoints[r]:void 0;for(let o=r;o>=0;o--){const s=this.cache.checkpoints[o];if(s==null)throw new Error("VirtualizedFileDiff: invalid checkpoint index");if(s.renderedLineIndex%t===0)return s}}getExpandedLineCount(e,t){let n=0;if(e.isPartial){for(const a of e.hunks)n+=t==="split"?a.splitLineCount:a.unifiedLineCount;return n}const{expandUnchanged:i=!1,collapsedContextThreshold:r=1}=this.options,o=i?!0:this.hunksRenderer.getExpandedHunksMap();for(const[a,l]of e.hunks.entries()){const f=t==="split"?l.splitLineCount:l.unifiedLineCount;n+=f;const h=Math.max(l.collapsedBefore,0),{fromStart:d,fromEnd:c,renderAll:u}=_e({isPartial:e.isPartial,rangeSize:h,expandedHunks:o,hunkIndex:a,collapsedContextThreshold:r});h>0&&(n+=u?h:d+c)}const s=je({fileDiff:e,hunkIndex:e.hunks.length-1,expandedHunks:o,collapsedContextThreshold:r,errorPrefix:"VirtualizedFileDiff"});return s!=null&&(n+=s.fromStart+s.fromEnd),n}computeRenderRangeFromWindow(e,t,{top:n,bottom:i}){const{disableFileHeader:r=!1,expandUnchanged:o=!1,collapsedContextThreshold:s=1}=this.options,{hunkLineCount:a,lineHeight:l}=this.metrics,f=this.getDiffStyle(),h=this.getHunkSeparatorType(),d=this.height;let c=this.cache.totalLines>0?this.cache.totalLines:this.getExpandedLineCount(e,f);const u=ne(this.metrics,r),p=e.hunks.length>0?Rt(this.metrics):0,{fileAnnotationHeight:b}=this.cache,g=u+b,v=Math.max(0,d-u-b-p),S=this.hasFileAnnotations(e),m=t+u,y=b>0&&S&&m<i&&m+b>n;if(t<n-d||t>i)return{startingLine:0,totalLines:0,bufferBefore:0,bufferAfter:d-u-p};if(c<=a||e.hunks.length===0)return{startingLine:0,totalLines:a,bufferBefore:0,bufferAfter:0};this.approximateLayoutCheckpoints(),c=this.cache.totalLines>0?this.cache.totalLines:c;const x=Math.ceil(Math.max(i-n,0)/l),k=Math.ceil(x/a)*a+a,N=k/a,be=N,Q=[],ve=(n+i)/2,Z=this.getLayoutCheckpointBeforeTop(Math.max(0,n-t-k*l*2),a);let M=t+(Z?.top??g),se=Z?.renderedLineIndex??0,A,H,B;if(Te({diff:e,diffStyle:f,startingLine:Z?.renderedLineIndex??0,expandedHunks:o?!0:this.hunksRenderer.getExpandedHunksMap(),collapsedContextThreshold:s,callback:({hunkIndex:De,hunk:Me,collapsedBefore:de,collapsedAfter:fe,deletionLine:E,additionLine:R})=>{const F=R!=null?R.splitLineIndex:E.splitLineIndex,J=R!=null?R.unifiedLineIndex:E.unifiedLineIndex,G=(R?.noEOFCR??!1)||(E?.noEOFCR??!1),z=(de>0?pe({type:h,metrics:this.metrics,hunkIndex:De,hunkSpecs:Me?.hunkSpecs}):void 0)?.totalHeight??0;M+=z;const he=se%a===0,I=Math.floor(se/a);if(he&&(Q[I]=M-(t+g+z),B!=null)){if(B<=0)return!0;B--}const Ne=this.getLineHeight(f==="split"?F:J,G);return M>n-Ne&&M<i&&(A??=I),H==null&&M+Ne>ve&&(H=I),B==null&&M>=i&&he&&(B=be),se++,M+=Ne,fe>0&&(M+=me({type:h,metrics:this.metrics})?.totalHeight??0),!1}}),A==null)if(y)A=0,H=0;else return{startingLine:0,totalLines:0,bufferBefore:0,bufferAfter:d-u-p};H??=A;const j=Math.round(H-N/2),L=Math.max(0,Math.ceil(c/a)-N),w=Math.max(0,Math.min(j,L)),T=w*a,U=j<0?k+j*a:k,X=Q[w]??0,ae=T===0?0:b+X,le=w+U/a,Se=le<Q.length?v-Q[le]:v-(M-t-g);return{startingLine:T,totalLines:U,bufferBefore:ae,bufferAfter:Math.max(0,Se)}}};function Hi(e){let t;for(const n of e){if(n==null)continue;const i=n.children[1];if(i instanceof HTMLElement)for(const r of i.children)r instanceof HTMLElement&&r.dataset.lineAnnotation===En&&(t=Math.max(t??0,r.getBoundingClientRect().height))}return t}function Ri(e){const t=Array.from(e).sort((o,s)=>o[0]-s[0]),n=[],i=[0];let r=0;for(const[o,s]of t)n.push(o),r+=s,i.push(r);return{lineIndexes:n,prefixTotals:i}}function St({lineIndexes:e,prefixTotals:t},n,i){if(n>=i||e.length===0)return 0;const r=yt(e,n);return(t[yt(e,i)]??0)-(t[r]??0)}function yt(e,t){let n=0,i=e.length;for(;n<i;){const r=n+i>>1,o=e[r];if(o==null)throw new Error("VirtualizedFileDiff: invalid prefix index");o<t?n=r+1:i=r}return n}function Di(e){return Math.ceil(e/Xe)*Xe}function Mi(e,t){let n=0;for(const i of e)i<t&&n++;return n}function Ni({diffStyle:e,hunk:t,rowCount:n}){if(n<=0||!t.noEOFCRAdditions&&!t.noEOFCRDeletions)return[];const i=t.hunkContent.at(-1);if(i==null)return[];if(i.type==="context")return[n-1];const r=Math.max(i.deletions,i.additions),o=i.deletions+i.additions;if(e==="split")return r>0&&(t.noEOFCRAdditions||t.noEOFCRDeletions)?[n-1]:[];const s=[],a=n-o;return i.deletions>0&&t.noEOFCRDeletions&&s.push(a+i.deletions-1),i.additions>0&&t.noEOFCRAdditions&&s.push(n-1),s}function Ii(e,t){return(e.diffStyle??"split")!==(t.diffStyle??"split")||(e.overflow??"scroll")!==(t.overflow??"scroll")||(e.collapsed??!1)!==(t.collapsed??!1)||(e.disableLineNumbers??!1)!==(t.disableLineNumbers??!1)||(e.disableFileHeader??!1)!==(t.disableFileHeader??!1)||(e.diffIndicators??"bars")!==(t.diffIndicators??"bars")||(e.hunkSeparators??"line-info")!==(t.hunkSeparators??"line-info")||(e.expandUnchanged??!1)!==(t.expandUnchanged??!1)||(e.collapsedContextThreshold??1)!==(t.collapsedContextThreshold??1)||e.unsafeCSS!==t.unsafeCSS}function Pi(e,t){return(e.disableFileHeader??!1)!==(t.disableFileHeader??!1)||(e.hunkSeparators??"line-info")!==(t.hunkSeparators??"line-info")||(e.expandUnchanged??!1)!==(t.expandUnchanged??!1)||(e.collapsedContextThreshold??1)!==(t.collapsedContextThreshold??1)}function Ui(e){return typeof e=="function"?"custom":e??"line-info"}function Fi(e,t){const[n,i]=e.split(",").map(Number);return t==="split"?i:n}function zi({hunkIndex:e,lineIndex:t,conflictIndex:n}){return`merge-conflict-action-${e}-${t}-${n}`}function Oi(e,t){const n=t.hunks[e.hunkIndex];if(n!=null)return{hunkIndex:e.hunkIndex,lineIndex:Bi(n,e.startContentIndex)}}function Bi(e,t){let n=e.unifiedLineStart;for(let i=0;i<t;i++){const r=e.hunkContent[i];n+=r.type==="context"?r.lines:r.deletions+r.additions}return n}function Gi(e){const t=jt(e);if(t.length!==1)throw console.error(t),new Error("PatchDiff: Provided patch must include only 1 patch, with 1 diff");const{files:n}=t[0];if(n.length!==1)throw console.error(n),new Error("FileDiff: Provided patch must contain exactly 1 file diff");return n[0]}const Vi={position:"absolute",top:0,bottom:0,textAlign:"center",whiteSpace:"normal",touchAction:"none"},$i={display:"contents"};function xt(){return null}function Wi({fileDiff:e,actions:t,renderCustomHeader:n,renderHeaderPrefix:i,renderHeaderFilenameSuffix:r,renderHeaderMetadata:o,renderAnnotation:s,renderGutterUtility:a,renderMergeConflictUtility:l,lineAnnotations:f,getHoveredLine:h,getInstance:d}){const c=n?.(e),u=i?.(e),p=r?.(e),b=o?.(e);return D.jsxs(D.Fragment,{children:[c!=null?D.jsx("div",{slot:Je,children:c}):D.jsxs(D.Fragment,{children:[u!=null&&D.jsx("div",{slot:"header-prefix",children:u}),p!=null&&D.jsx("div",{slot:"header-filename-suffix",children:p}),b!=null&&D.jsx("div",{slot:"header-metadata",children:b})]}),s!=null&&f?.map((g,v)=>D.jsx("div",{slot:re(g),children:s(g)},v)),t!=null&&l!=null&&d!=null&&t.map(g=>{if(g==null)return;const v=_i(g,e);return D.jsx("div",{slot:v,style:$i,children:l(g,d)},v)}),a!=null&&D.jsx("div",{slot:"gutter-utility-slot",style:Vi,children:a(h)})]})}function _i(e,t){const n=Oi(e,t);return n!=null?zi({hunkIndex:n.hunkIndex,lineIndex:n.lineIndex,conflictIndex:e.conflictIndex}):void 0}function ji(e){const t=P.useRef(e);return P.useInsertionEffect(()=>void(t.current=e)),P.useCallback((...n)=>t.current(...n),[])}const qi=P.createContext(void 0),Ki=P.createContext(void 0);function Yi(){return P.useContext(Ki)}function Xi(e,t){return typeof window>"u"&&t!=null?D.jsxs(D.Fragment,{children:[D.jsx("template",{shadowrootmode:"open",dangerouslySetInnerHTML:{__html:t}}),e]}):D.jsx(D.Fragment,{children:e})}const Ji=P.createContext(void 0);function Qi(){return P.useContext(Ji)}const Ct=typeof window>"u"?P.useEffect:P.useLayoutEffect;function Zi({fileDiff:e,options:t,lineAnnotations:n,selectedLines:i,prerenderedHTML:r,metrics:o,hasGutterRenderUtility:s,hasCustomHeader:a,disableWorkerPool:l,contentEditable:f}){const h=Qi(),d=i!==void 0,c=P.useContext(qi),u=Yi(),p=P.useRef(null),b=ji(g=>{if(g!=null){if(p.current!=null)throw new Error("useFileDiffInstance: An instance should not already exist when a node is created");h!=null?p.current=new Ti(Ve({controlledSelection:d,contentEditable:f,hasCustomHeader:a,hasEditor:u!==void 0,hasGutterRenderUtility:s,options:t}),h,o,l?void 0:c,!0):p.current=new Ft(Ve({controlledSelection:d,contentEditable:f,hasCustomHeader:a,hasEditor:u!==void 0,hasGutterRenderUtility:s,options:t}),l?void 0:c,!0),p.current.hydrate({fileDiff:e,fileContainer:g,lineAnnotations:n,prerenderedHTML:r})}else{if(p.current==null)throw new Error("useFileDiffInstance: A FileDiff instance should exist when unmounting");p.current.cleanUp(),p.current=null}});return Ct(()=>{const{current:g}=p;if(g==null)return;const v=Ve({controlledSelection:d,contentEditable:f,hasCustomHeader:a,hasEditor:u!==void 0,hasGutterRenderUtility:s,options:t}),S=!Dt(g.options,v);g.setOptions(v),g.render({forceRender:S,fileDiff:e,lineAnnotations:n}),i!==void 0&&g.setSelectedLines(i)}),Ct(()=>{if(f&&p.current!=null){if(u===void 0)throw new Error("FileDiff: Editor is not attached");return u.edit(p.current)}},[f,u]),{ref:b,getHoveredLine:P.useCallback(()=>p.current?.getHoveredLine(),[])}}function Ve({options:e,controlledSelection:t,contentEditable:n,hasCustomHeader:i,hasEditor:r,hasGutterRenderUtility:o}){const s=n&&r,a=t||o||i;if(!a&&!s)return e;let l={...e};return a&&(l={...l,controlledSelection:t,renderCustomHeader:i?xt:e?.renderCustomHeader,renderGutterUtility:o?xt:e?.renderGutterUtility}),s&&(l={...l,useTokenTransformer:!0,enableGutterUtility:!1,enableLineSelection:!1,expandUnchanged:!0,lineHoverHighlight:"disabled"}),l}function rr({patch:e,options:t,metrics:n,lineAnnotations:i,selectedLines:r,className:o,style:s,prerenderedHTML:a,renderAnnotation:l,renderCustomHeader:f,renderHeaderPrefix:h,renderHeaderFilenameSuffix:d,renderHeaderMetadata:c,renderGutterUtility:u,disableWorkerPool:p=!1,contentEditable:b=!1}){const g=er(e),{ref:v,getHoveredLine:S}=Zi({fileDiff:g,options:t,metrics:n,lineAnnotations:i,selectedLines:r,prerenderedHTML:a,hasGutterRenderUtility:u!=null,hasCustomHeader:f!=null,disableWorkerPool:p,contentEditable:b});return D.jsx(At,{ref:v,className:o,style:s,children:Xi(Wi({fileDiff:g,renderCustomHeader:f,renderHeaderPrefix:h,renderHeaderFilenameSuffix:d,renderHeaderMetadata:c,renderAnnotation:l,lineAnnotations:i,renderGutterUtility:u,getHoveredLine:S}),a)})}function er(e){return P.useMemo(()=>Gi(e),[e])}export{qe as A,Dt as B,An as C,Qi as D,Yi as E,En as F,Vi as G,ji as H,on as I,xt as J,Xi as K,rr as P,un as R,Rn as S,qi as W,Fe as a,Mt as b,at as c,Nt as d,vn as e,re as f,lt as g,yn as h,Tn as i,wn as j,kn as k,Vn as l,Nn as m,In as n,Pn as o,nt as p,Ke as q,On as r,Hn as s,Bn as t,Wn as u,ze as v,zn as w,ft as x,Dn as y,$n as z};
