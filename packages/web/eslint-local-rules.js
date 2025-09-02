// Sprint 19 Security: Custom ESLint rules for security hardening

module.exports = {
  'no-service-role-in-client': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Prevent service role key usage in client-side code',
        category: 'Security',
        recommended: true
      },
      fixable: null,
      schema: []
    },
    create(context) {
      const CLIENT_FILE_PATTERNS = [
        /\/components\//,
        /\/app\/.*\/page\.(tsx?|jsx?)$/,
        /\/app\/.*\/layout\.(tsx?|jsx?)$/,
        /\/app\/.*\/loading\.(tsx?|jsx?)$/,
        /\/app\/.*\/error\.(tsx?|jsx?)$/,
        /\/app\/.*\/not-found\.(tsx?|jsx?)$/,
        /\/app\/.*\/global-error\.(tsx?|jsx?)$/,
        /\/hooks\//,
        /\/lib\/.*(?<!server)\.(tsx?|jsx?)$/,
        /\/utils\/.*(?<!server)\.(tsx?|jsx?)$/
      ];
      
      const filename = context.getFilename();
      const isClientFile = CLIENT_FILE_PATTERNS.some(pattern => pattern.test(filename));
      
      if (!isClientFile) {
        return {}; // Skip server files
      }
      
      return {
        // Check for direct environment variable access
        MemberExpression(node) {
          if (
            node.object &&
            node.object.type === 'MemberExpression' &&
            node.object.object &&
            node.object.object.name === 'process' &&
            node.object.property &&
            node.object.property.name === 'env' &&
            node.property &&
            node.property.name === 'SUPABASE_SERVICE_ROLE_KEY'
          ) {
            context.report({
              node,
              message: 'Service role key cannot be used in client-side code. This would expose the key in the client bundle.'
            });
          }
        },
        
        // Check for string literals containing service role pattern
        Literal(node) {
          if (
            typeof node.value === 'string' &&
            (node.value.includes('SUPABASE_SERVICE_ROLE_KEY') ||
             node.value.match(/sb_service_role_[a-zA-Z0-9]+/))
          ) {
            context.report({
              node,
              message: 'Service role key or pattern detected in client code. This is a security vulnerability.'
            });
          }
        },
        
        // Check for imports of service role client in client files
        ImportDeclaration(node) {
          if (
            node.source &&
            node.source.value &&
            typeof node.source.value === 'string' &&
            (node.source.value.includes('/service') ||
             node.source.value.includes('createServiceRoleClient'))
          ) {
            context.report({
              node,
              message: 'Service role client cannot be imported in client-side code. Use server-side API routes instead.'
            });
          }
        },
        
        // Check for dynamic imports of service role modules
        CallExpression(node) {
          if (
            node.callee &&
            node.callee.type === 'Import' &&
            node.arguments &&
            node.arguments[0] &&
            node.arguments[0].type === 'Literal' &&
            typeof node.arguments[0].value === 'string' &&
            node.arguments[0].value.includes('/service')
          ) {
            context.report({
              node,
              message: 'Dynamic import of service role client in client code is prohibited for security.'
            });
          }
        }
      };
    }
  },
  
  'secure-token-patterns': {
    meta: {
      type: 'suggestion',
      docs: {
        description: 'Enforce secure token handling patterns',
        category: 'Security',
        recommended: true
      },
      fixable: null,
      schema: []
    },
    create(context) {
      return {
        // Warn about predictable token generation
        TemplateLiteral(node) {
          const source = context.getSourceCode().getText(node);
          if (
            source.includes('token_') &&
            (source.includes('Date.now()') || source.includes('Math.random()'))
          ) {
            context.report({
              node,
              message: 'Avoid predictable token formats. Use cryptographically secure random tokens instead.'
            });
          }
        },
        
        // Warn about token logging
        CallExpression(node) {
          if (
            node.callee &&
            node.callee.type === 'MemberExpression' &&
            node.callee.object &&
            node.callee.object.name === 'console' &&
            node.arguments &&
            node.arguments.length > 0
          ) {
            const args = node.arguments;
            for (const arg of args) {
              if (arg.type === 'Literal' && typeof arg.value === 'string') {
                if (arg.value.toLowerCase().includes('token')) {
                  context.report({
                    node: arg,
                    message: 'Avoid logging tokens or token-related information for security.'
                  });
                  break;
                }
              }
              if (arg.type === 'TemplateLiteral') {
                const source = context.getSourceCode().getText(arg);
                if (source.toLowerCase().includes('token')) {
                  context.report({
                    node: arg,
                    message: 'Avoid logging tokens or token-related information for security.'
                  });
                  break;
                }
              }
            }
          }
        }
      };
    }
  }
};