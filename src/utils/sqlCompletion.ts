// monaco-sql-tables.ts
import * as monaco from 'monaco-editor';

let CATALOG_DB_TABLES: Record<string, Record<string, string[]>> = {};

export function initMonacoSQLTables(monacoInstance: typeof monaco) {
  try {
    // const res = await getCatalogDbTables(); 
    const res = {
      'data': {
        'data': {
          'hive_catalog': {
            'gds_d_it_p': ['tab1', 'tab2', 'tab3'
              , 'tab4', 'tab5', 'tab6', 'tab7', 'tab8', 'tab9', 'tab10', 'tab11'
              , 'tab12', 'tab13', 'tab14', 'tab15', 'tab16', 'tab17', 'tab18', 'tab19'],
            'scs_it_p': ['tab1', 'tab2', 'tab3'
              , 'tab4', 'tab5', 'tab6', 'tab7', 'tab8', 'tab9', 'tab10', 'tab11'
              , 'tab12', 'tab13', 'tab14', 'tab15', 'tab16', 'tab17', 'tab18', 'tab19']
          },
          'paimon_catalog': {
            'gds_d_it_p': ['tab1', 'tab2', 'tab3'
              , 'tab4', 'tab5', 'tab6', 'tab7', 'tab8', 'tab9', 'tab10', 'tab11'
              , 'tab12', 'tab13', 'tab14', 'tab15', 'tab16', 'tab17', 'tab18', 'tab19'],
            'scs_it_p': ['tab1', 'tab2', 'tab3'
              , 'tab4', 'tab5', 'tab6', 'tab7', 'tab8', 'tab9', 'tab10', 'tab11'
              , 'tab12', 'tab13', 'tab14', 'tab15', 'tab16', 'tab17', 'tab18', 'tab19']
          }

        },
        'success': 'true'
      }
    }

    if (res && res.data.success && res.data.data) {
      CATALOG_DB_TABLES = res.data.data;
    }
  } catch (err) {
    console.error('获取表信息失败', err);
  }


  monacoInstance.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model, position) => {
      const wordInfo = model.getWordUntilPosition(position);
      const range = new monacoInstance.Range(
        position.lineNumber,
        wordInfo.startColumn,
        position.lineNumber,
        wordInfo.endColumn
      );

      const textBeforeCursor = model.getValueInRange(
        new monacoInstance.Range(1, 1, position.lineNumber, position.column)
      ).trim();

      const lastToken = textBeforeCursor.split(/\s+/).pop() || '';
      const segments = lastToken.split('.'); // 分段

      let suggestions: monaco.languages.CompletionItem[] = [];

      if (segments.length === 1) {
        // 第一段: catalog 提示
        const input = segments[0].toLowerCase();
        Object.keys(CATALOG_DB_TABLES)
          .filter(catalog => catalog.startsWith(input))
          .forEach(catalog => {
            suggestions.push({
              label: catalog,
              kind: monacoInstance.languages.CompletionItemKind.Module,
              insertText: catalog,
              range,
              detail: 'catalog',
              documentation: `Catalog: ${catalog}`
            });
          });
      } else if (segments.length === 2) {
        // 第二段: db 提示
        const [catalogInput, dbInput] = segments;
        const dbs = CATALOG_DB_TABLES[catalogInput];
        if (dbs) {
          Object.keys(dbs)
            .filter(db => db.startsWith(dbInput))
            .forEach(db => {
              suggestions.push({
                label: db,
                kind: monacoInstance.languages.CompletionItemKind.Folder,
                insertText: db,
                range,
                detail: `db in ${catalogInput}`,
                documentation: `Database: ${db}`
              });
            });
        }
      } else if (segments.length === 3) {
        // 第三段: table 提示
        const [catalogInput, dbInput, tableInput] = segments;
        const tables = CATALOG_DB_TABLES[catalogInput]?.[dbInput];
        if (tables) {
          tables
            .filter(table => table.startsWith(tableInput))
            .forEach(table => {
              suggestions.push({
                label: table,
                kind: monacoInstance.languages.CompletionItemKind.File,
                insertText: table,
                range,
                detail: `table in ${catalogInput}.${dbInput}`,
                documentation: `Table: ${table}`
              });
            });
        }
      }

      return { suggestions };
    }
  });
}

