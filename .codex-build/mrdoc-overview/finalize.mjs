import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PresentationFile } from '@oai/artifact-tool';

const root='C:/Users/BODA SHIVA KUMAR/OneDrive/Desktop/V2_MR.DOC';
const skill='C:/Users/BODA SHIVA KUMAR/AppData/Local/CodexProfiles/personal/codex-home/plugins/cache/openai-primary-runtime/presentations/26.1022.11436/skills/presentations';
const build=path.join(root,'.codex-build/mrdoc-overview');
const staging=path.join(root,'.codex-finalizer');
const finalPath=path.join(root,'deliverables/MrDoc_Project_Overview_Final.pptx');
await fs.mkdir(staging,{recursive:true});
await fs.mkdir(path.dirname(finalPath),{recursive:true});
const candidatePath=path.join(staging,'MrDoc_Project_Overview_Final_candidate.pptx');
await fs.copyFile(path.join(build,'draft.pptx'),candidatePath);
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({
  workspaceDir:root,
  candidatePath,
  finalPath,
  pythonExecutable:'C:/Users/BODA SHIVA KUMAR/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
  explicitTotalSlideCount:8,
  requiredNativeTableOwnerSlides:[],
  requiredNativeChartOwnerSlides:[],
  fontPolicy:{basis:'design',families:['Arial']},
  verifyArtifactToolImport:true,
  receiptPath:path.join(staging,'MrDoc_Project_Overview_Final.validation.json'),
});
console.log(JSON.stringify(result,null,2));
