function encodeXML(str: any): string {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function serializeToXML(obj: any, name = 'PlannerProBackup'): string {
    if (obj === null) return `<${name} type="null"/>`;
    if (typeof obj === 'undefined') return '';
    if (typeof obj === 'string') return `<${name} type="string">${encodeXML(obj)}</${name}>`;
    if (typeof obj === 'number') return `<${name} type="number">${obj}</${name}>`;
    if (typeof obj === 'boolean') return `<${name} type="boolean">${obj}</${name}>`;
    
    if (Array.isArray(obj)) {
        let inner = obj.map(item => serializeToXML(item, 'Item')).join('');
        return `<${name} type="array">${inner}</${name}>`;
    }
    
    if (typeof obj === 'object') {
        let inner = Object.keys(obj).map(k => {
            const safeKey = k.replace(/[^a-zA-Z0-9_]/g, '_');
            return serializeToXML(obj[k], safeKey);
        }).join('');
        return `<${name} type="object">${inner}</${name}>`;
    }
    
    return '';
}

export function parseFromXML(xmlString: string): any {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, "application/xml");
    const root = doc.documentElement;
    
    if (root.nodeName === 'parsererror') throw new Error('Invalid XML');
    
    function parseNode(node: Element): any {
        const type = node.getAttribute('type');
        
        if (type === 'null') return null;
        if (type === 'string') return node.textContent || '';
        if (type === 'number') return Number(node.textContent);
        if (type === 'boolean') return node.textContent === 'true';
        
        if (type === 'array') {
            const arr: any[] = [];
            for (let i = 0; i < node.children.length; i++) {
                arr.push(parseNode(node.children[i]));
            }
            return arr;
        }
        
        if (type === 'object') {
            const obj: any = {};
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                obj[child.tagName] = parseNode(child);
            }
            return obj;
        }
        
        return node.textContent;
    }
    
    return parseNode(root);
}
