import { Collection, RecordItem, FieldDef } from '../types';

const escapeXml = (unsafe: string) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const exportFullCollection = (collection: Collection, records: RecordItem[], tabIdToExport?: string) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<ListerExport>\n`;
  xml += `  <Collection id="${collection.id}" name="${escapeXml(collection.name)}" icon="${escapeXml(collection.icon)}" viewMode="${collection.viewMode || 'detailed'}" pinned="${!!collection.pinned}">\n`;
  if (collection.description) {
    xml += `    <Description>${escapeXml(collection.description)}</Description>\n`;
  }
  
  xml += `    <Fields>\n`;
  collection.fields.forEach(f => {
    xml += `      <Field id="${f.id}" name="${escapeXml(f.name)}" type="${f.type}" required="${f.required}"`;
    if (f.dependsOn) xml += ` dependsOn="${f.dependsOn}"`;
    if (f.color) xml += ` color="${f.color}"`;
    if (f.section) xml += ` section="${escapeXml(f.section)}"`;
    if (f.width) xml += ` width="${f.width}"`;
    
    if (f.options && f.options.length > 0) {
      xml += `>\n`;
      xml += `        <Options>\n`;
      f.options.forEach(opt => {
        xml += `          <Option>${escapeXml(opt)}</Option>\n`;
      });
      xml += `        </Options>\n`;
      xml += `      </Field>\n`;
    } else {
      xml += ` />\n`;
    }
  });
  xml += `    </Fields>\n`;

  xml += `    <Tabs>\n`;
  (collection.tabs || []).forEach(t => {
    if (!tabIdToExport || t.id === tabIdToExport) {
       xml += `      <Tab id="${t.id}" name="${escapeXml(t.name)}" />\n`;
    }
  });
  xml += `    </Tabs>\n`;

  xml += `    <Settings>\n`;
  if (collection.simplifiedViewFieldIds) {
    collection.simplifiedViewFieldIds.forEach(id => {
      xml += `      <SimplifiedViewFieldId>${id}</SimplifiedViewFieldId>\n`;
    });
  }
  xml += `    </Settings>\n`;
  xml += `  </Collection>\n`;
  
  xml += `  <Records>\n`;
  const recordsToExport = tabIdToExport ? records.filter(r => r.collectionId === collection.id && r.tabId === tabIdToExport) : records.filter(r => r.collectionId === collection.id);
  recordsToExport.forEach(r => {
    xml += `    <Record id="${r.id}" tabId="${r.tabId}" order="${r.order || 0}">\n`;
    collection.fields.forEach(f => {
      const val = r.data[f.id];
      if (val !== undefined && val !== null && val !== '') {
        xml += `      <FieldData id="${f.id}">${escapeXml(String(val))}</FieldData>\n`;
      }
    });
    xml += `    </Record>\n`;
  });
  xml += `  </Records>\n`;
  xml += `</ListerExport>`;

  const blob = new Blob([xml], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  let downloadName = `${collection.name.replace(/\s+/g, '_')}`;
  if (tabIdToExport) {
    const tab = collection.tabs?.find(t => t.id === tabIdToExport);
    downloadName += `_${(tab?.name || 'Tab').replace(/\s+/g, '_')}`;
  } else {
    downloadName += `_Full_Backup`;
  }
  a.download = `${downloadName}.xml`;
  
  a.click();
  URL.revokeObjectURL(url);
};

export const parseFullCollectionXML = (xmlString: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("Invalid XML file.");
  }

  const exportNode = xmlDoc.getElementsByTagName("ListerExport")[0];
  if (!exportNode) {
    throw new Error("Unrecognized file format. Missing ListerExport tag.");
  }

  const collectionNode = exportNode.getElementsByTagName("Collection")[0];
  if (!collectionNode) {
    throw new Error("Unrecognized file format. Missing Collection tag.");
  }

  const collection: any = {
    id: collectionNode.getAttribute("id") + "_imported_" + Date.now(),
    name: collectionNode.getAttribute("name"),
    icon: collectionNode.getAttribute("icon"),
    viewMode: collectionNode.getAttribute("viewMode") || 'detailed',
    pinned: collectionNode.getAttribute("pinned") === "true",
    fields: [],
    tabs: [],
    simplifiedViewFieldIds: [],
    createdAt: new Date().toISOString()
  };

  const descNode = collectionNode.getElementsByTagName("Description")[0];
  if (descNode) collection.description = descNode.textContent;

  const fieldsNode = collectionNode.getElementsByTagName("Fields")[0];
  if (fieldsNode) {
    const fieldNodes = fieldsNode.getElementsByTagName("Field");
    for (let i = 0; i < fieldNodes.length; i++) {
      const fn = fieldNodes[i];
      const fieldDef: FieldDef = {
        id: fn.getAttribute("id") || `field_${i}`,
        name: fn.getAttribute("name") || 'Unknown',
        type: (fn.getAttribute("type") || 'text') as any,
        required: fn.getAttribute("required") === "true",
        dependsOn: fn.getAttribute("dependsOn") || undefined,
        color: fn.getAttribute("color") as any,
        section: fn.getAttribute("section") || undefined,
        width: (fn.getAttribute("width") as any) || undefined
      };
      
      const optionsNode = fn.getElementsByTagName("Options")[0];
      if (optionsNode) {
        const optionNodes = optionsNode.getElementsByTagName("Option");
        fieldDef.options = [];
        for (let j = 0; j < optionNodes.length; j++) {
          fieldDef.options.push(optionNodes[j].textContent || '');
        }
      }
      
      collection.fields.push(fieldDef);
    }
  }

  const tabsNode = collectionNode.getElementsByTagName("Tabs")[0];
  if (tabsNode) {
    const tabNodes = tabsNode.getElementsByTagName("Tab");
    for (let i = 0; i < tabNodes.length; i++) {
      const tn = tabNodes[i];
      collection.tabs.push({
        id: tn.getAttribute("id"),
        name: tn.getAttribute("name")
      });
    }
  }

  const settingsNode = collectionNode.getElementsByTagName("Settings")[0];
  if (settingsNode) {
    const sNodes = settingsNode.getElementsByTagName("SimplifiedViewFieldId");
    for (let i = 0; i < sNodes.length; i++) {
      collection.simplifiedViewFieldIds.push(sNodes[i].textContent);
    }
  }

  const recordsNode = exportNode.getElementsByTagName("Records")[0];
  const records: any[] = [];
  
  if (recordsNode) {
    const recordNodes = recordsNode.getElementsByTagName("Record");
    for (let i = 0; i < recordNodes.length; i++) {
      const rn = recordNodes[i];
      const rec: any = {
        id: rn.getAttribute("id") + "_imported_" + Date.now(),
        collectionId: collection.id,
        tabId: rn.getAttribute("tabId"),
        order: Number(rn.getAttribute("order") || 0),
        data: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const fieldDataNodes = rn.getElementsByTagName("FieldData");
      for (let j = 0; j < fieldDataNodes.length; j++) {
        const fdn = fieldDataNodes[j];
        const fId = fdn.getAttribute("id");
        if (fId) {
          const fieldDef = collection.fields.find((f: any) => f.id === fId);
          let val = fdn.textContent;

          if (fieldDef && val !== null) {
            if (fieldDef.type === 'checkbox' || fieldDef.type === 'tag') {
              rec.data[fId] = val === 'true' || val === 'Yes' || val === fieldDef.name;
            } else if (fieldDef.type === 'number') {
              rec.data[fId] = Number(val);
            } else {
              rec.data[fId] = val;
            }
          } else {
             rec.data[fId] = val;
          }
        }
      }
      records.push(rec);
    }
  }

  return { collection, records };
};
