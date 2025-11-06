import { DocumentConfig } from '../types';

export const DEFAULT_DOCUMENT_CONFIG: DocumentConfig = {
    invoice: [
        { key: 'invoice_number', label: '請求書番号', enabled: true, isItemField: false, outputFormat: 'none', type: 'string', instruction: '「請求書番号」「Invoice No.」などの項目を探してください。' },
        { key: 'issue_date', label: '発行日', enabled: true, isItemField: false, outputFormat: 'date-yyyy-mm-dd', type: 'string', instruction: '「発行日」「作成日」などの日付を抽出してください。' },
        { key: 'due_date', label: '支払期限', enabled: true, isItemField: false, outputFormat: 'date-yyyy-mm-dd', type: 'string', instruction: '「支払期限」「お支払い期限」などの日付を抽出してください。' },
        { key: 'issuer_name', label: '発行元', enabled: true, isItemField: false, outputFormat: 'none', type: 'string', instruction: '請求書を発行した会社名や個人名を抽出してください。' },
        { key: 'recipient_name', label: '宛名', enabled: true, isItemField: false, outputFormat: 'none', type: 'string', instruction: '請求書の宛先となっている会社名や個人名を抽出してください。' },
        { key: 'total_amount', label: '合計金額', enabled: true, isItemField: false, outputFormat: 'none', type: 'number', instruction: '「合計」「ご請求額」など、最終的な請求総額を抽出してください。' },
        { key: 'description', label: '品名・処理内容', enabled: true, isItemField: true, outputFormat: 'none', type: 'string', instruction: '品目やサービス内容が記載されている項目です。' },
        { key: 'quantity', label: '数量', enabled: true, isItemField: true, outputFormat: 'none', type: 'number', instruction: '品目の数量を抽出してください。' },
        { key: 'unit_price', label: '単価', enabled: true, isItemField: true, outputFormat: 'none', type: 'number', instruction: '品目の単価を抽出してください。' },
        { key: 'total_price', label: '金額', enabled: true, isItemField: true, outputFormat: 'none', type: 'number', instruction: '品目ごとの合計金額（単価 x 数量）を抽出してください。' },
        { key: 'tax_rate', label: '税率', enabled: true, isItemField: true, outputFormat: 'none', type: 'string', instruction: '消費税率（例: 10%, 8%）や「非課税」などの情報を抽出してください。' },
    ],
    purchase_order: [
        { key: 'order_number', label: '注文番号', enabled: true, isItemField: false, outputFormat: 'none', type: 'string', instruction: '「注文番号」「発注番号」「PO Number」などの項目を探してください。' },
        { key: 'order_date', label: '注文日', enabled: true, isItemField: false, outputFormat: 'date-yyyy-mm-dd', type: 'string', instruction: '「注文日」「発注日」などの日付を抽出してください。' },
        { key: 'vendor_name', label: 'ベンダー名', enabled: true, isItemField: false, outputFormat: 'none', type: 'string', instruction: '発注先の会社名や店舗名を抽出してください。' },
        { key: 'shipping_address', label: '配送先住所', enabled: true, isItemField: false, outputFormat: 'none', type: 'string', instruction: '商品の配送先住所を抽出してください。' },
        { key: 'total_amount', label: '合計金額', enabled: true, isItemField: false, outputFormat: 'none', type: 'number', instruction: '「合計」「発注総額」など、最終的な発注総額を抽出してください。' },
        { key: 'description', label: '品名・処理内容', enabled: true, isItemField: true, outputFormat: 'none', type: 'string', instruction: '品目やサービス内容が記載されている項目です。' },
        { key: 'quantity', label: '数量', enabled: true, isItemField: true, outputFormat: 'none', type: 'number', instruction: '品目の数量を抽出してください。' },
        { key: 'unit_price', label: '単価', enabled: true, isItemField: true, outputFormat: 'none', type: 'number', instruction: '品目の単価を抽出してください。' },
        { key: 'total_price', label: '金額', enabled: true, isItemField: true, outputFormat: 'none', type: 'number', instruction: '品目ごとの合計金額（単価 x 数量）を抽出してください。' },
        { key: 'tax_rate', label: '税率', enabled: false, isItemField: true, outputFormat: 'none', type: 'string', instruction: '消費税率（例: 10%, 8%）や「非課税」などの情報を抽出してください。' },
    ],
};
