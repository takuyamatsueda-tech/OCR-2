import { GoogleGenAI, Type, Schema } from "@google/genai";
import { getDocument, GlobalWorkerOptions } from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
import type { DocumentData, DocumentType, DocumentFieldConfig } from '../types';

GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const fileToGenerativeParts = async (file: File, maxPages?: number) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const imageParts = [];
    const pagesToProcess = Math.min(pdf.numPages, maxPages || 5); // Process up to maxPages (default 5)

    for (let i = 1; i <= pagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2, rotation: page.rotate });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            const base64Data = canvas.toDataURL('image/jpeg').split(',')[1];
            imageParts.push({
                inlineData: { mimeType: 'image/jpeg', data: base64Data },
            });
        }
    }
    return imageParts;
};

const getPromptAndSchema = (docType: DocumentType, pageNumber: number, totalPages: number, config: DocumentFieldConfig[]) => {
    const boundingBoxSchema = {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.NUMBER },
        y: { type: Type.NUMBER },
        width: { type: Type.NUMBER },
        height: { type: Type.NUMBER },
      }
    };

    const fieldSchema = (type: Type.STRING | Type.NUMBER) => ({
      type: Type.OBJECT,
      properties: {
        value: { type },
        bounding_box: { type: Type.ARRAY, items: boundingBoxSchema },
      }
    });
    
    const enabledFields = config.filter(c => c.enabled);
    const topLevelFields = enabledFields.filter(c => !c.isItemField);
    const itemFields = enabledFields.filter(c => c.isItemField);

    const perPageItemSchemaProperties: { [key: string]: Schema } = {};
    itemFields.forEach(field => {
        perPageItemSchemaProperties[field.key] = fieldSchema(field.type === 'number' ? Type.NUMBER : Type.STRING);
    });

    const perPageItemSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: perPageItemSchemaProperties,
        },
    };
    
    const pageContextPrompt = `これは${totalPages}ページ中${pageNumber}ページ目の画像です。`;
    
    const commonPromptInstructions = `**重要: 全ての項目について、この単一画像上の位置を示すバウンディングボックス(bounding_box)を抽出してください。**

**座標系のルールを厳密に守ってください:**
*   **原点(0,0)は画像の「左上隅」です。**
*   **Y軸は「下方向」が正です。**
*   **単位はピクセルです。**
*   PDFのような左下を原点とする座標系は絶対に使用しないでください。

各項目について、その値(value)と、上記のルールに従ったバウンディングボックス(x, y, width, height)を抽出してください。
このページに項目が見つからない場合は、valueをnullにしてください。金額と数量は必ず数値型で返してください。`;

    const docTypeName = docType;
    
    const formatFieldsForPrompt = (fields: DocumentFieldConfig[]) => {
        return fields.map(f => `- ${f.label} (${f.key})${f.instruction ? `: ${f.instruction}` : ''}`).join('\n');
    };

    const topLevelFieldList = formatFieldsForPrompt(topLevelFields);
    const itemFieldList = formatFieldsForPrompt(itemFields);

    const schemaProperties: { [key: string]: Schema } = {};
    topLevelFields.forEach(field => {
      schemaProperties[field.key] = fieldSchema(field.type === 'number' ? Type.NUMBER : Type.STRING);
    });
    if (itemFields.length > 0) {
      schemaProperties['items'] = perPageItemSchema;
    }

    return {
        prompt: `あなたは高度な${docTypeName}処理AIです。提供された${docTypeName}の単一ページの画像から、以下の指示に厳密に従って項目を抽出し、JSON形式で結果を返してください。
${pageContextPrompt}
画像が横向きや逆さまの場合でも、内容を正しく認識してください。

${commonPromptInstructions}

**抽出対象の項目 (このページに記載されているもののみ):**

**基本項目:**
${topLevelFieldList}

**品目リスト (items):**
このページに記載されている品目のみを抽出してください。各品目から以下の項目を抽出してください。
${itemFieldList}`,
        schema: {
            type: Type.OBJECT,
            properties: schemaProperties,
        },
    };
};

export const extractDocumentData = async (file: File, documentType: DocumentType, config: DocumentFieldConfig[]): Promise<DocumentData> => {
    const imageParts = await fileToGenerativeParts(file);
    if (imageParts.length === 0) throw new Error("PDFから画像を抽出できませんでした。");

    let aggregatedData: Partial<DocumentData> = { items: [] };

    for (const [index, imagePart] of imageParts.entries()) {
        const pageNumber = index + 1;
        const { prompt, schema } = getPromptAndSchema(documentType, pageNumber, imageParts.length, config);
        const contents = { parts: [imagePart, { text: prompt }] };
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                },
            });

            const pageData = JSON.parse(response.text);

            // Merge results:
            Object.keys(pageData).forEach(key => {
                if (key !== 'items' && pageData[key]?.value !== null && !(aggregatedData as any)[key]?.value) {
                    (aggregatedData as any)[key] = pageData[key];
                }
            });

            // For line items, add the page number and append them to the list.
            if (pageData.items && Array.isArray(pageData.items)) {
                const itemsWithPageNumber = pageData.items.map((item: any) => ({
                    ...item,
                    page_number: { value: pageNumber } 
                }));
                aggregatedData.items = [...(aggregatedData.items || []), ...itemsWithPageNumber];
            }

        } catch (e) {
            console.error(`Error processing page ${pageNumber}:`, e);
            // Continue to next page even if one fails
        }
    }

    if (Object.keys(aggregatedData).length <= 1) { // Only contains items array
        throw new Error("ドキュメントから有効なデータを抽出できませんでした。");
    }

    // Ensure all fields from config exist in the final data, even if null
    config.forEach(field => {
        if (!field.isItemField && !(aggregatedData as any)[field.key]) {
            (aggregatedData as any)[field.key] = { value: null };
        }
    });


    return { ...aggregatedData, document_type: documentType } as DocumentData;
};

export const suggestFieldsForDocument = async (file: File): Promise<{ docTypeName: string, fields: DocumentFieldConfig[] }> => {
    const imageParts = await fileToGenerativeParts(file, 1); // Use the first page only for suggestions

    const schema = {
        type: Type.OBJECT,
        properties: {
            docTypeName: {
                type: Type.STRING,
                description: "この帳票の種類を日本語で記述してください（例: 納品書, 領収書）"
            },
            fields: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        key: { type: Type.STRING, description: "プログラム用の英語キー (snake_case)" },
                        label: { type: Type.STRING, description: "日本語の項目名" },
                        enabled: { type: Type.BOOLEAN },
                        isItemField: { type: Type.BOOLEAN, description: "表形式の品目項目か" },
                        outputFormat: { type: Type.STRING, description: "日付なら 'date-yyyy-mm-dd', それ以外は 'none'" },
                        type: { type: Type.STRING, description: "データ型 'string' or 'number'" },
                        instruction: { type: Type.STRING, description: "AIへの抽出指示" }
                    },
                    required: ["key", "label", "enabled", "isItemField", "outputFormat", "type", "instruction"]
                }
            }
        },
        required: ["docTypeName", "fields"]
    };

    const prompt = `あなたは高度な帳票分析AIです。提供された帳票の画像から、その帳票の種類を特定し、データ抽出に最適な項目リストを提案してください。
    
    **指示:**
    1.  まず、この帳票が何か（例: 請求書、納品書、領収書など）を日本語で特定してください。
    2.  次に、この帳票からデータを抽出するために必要と思われる項目をリストアップしてください。
    3.  項目は「基本項目（帳票全体で一つだけ存在する情報）」と「品目項目（表形式で複数存在する明細情報）」に分類してください。
    4.  各項目について、JSONスキーマで要求される全ての情報（key, label, isItemField など）を生成してください。
    5.  keyは英語のsnake_caseで、labelは日本語にしてください。
    6.  金額や数量は type を 'number' に、日付は outputFormat を 'date-yyyy-mm-dd' に設定してください。
    7.  全ての項目について enabled は true にしてください。
    
    最終的な出力は、指定されたJSONスキーマに厳密に従ってください。`;

    const contents = { parts: [...imageParts, { text: prompt }] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro', // Use a more powerful model for better suggestions
        contents,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        },
    });

    const result = JSON.parse(response.text);
    // Ensure `fields` is always an array
    if (!Array.isArray(result.fields)) {
        result.fields = [];
    }
    return { docTypeName: result.docTypeName, fields: result.fields };
};