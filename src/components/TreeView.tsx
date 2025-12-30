import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TreeNode {
  name: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
  path?: string;
}

interface TreeViewProps {
  data: TreeNode[];
  className?: string;
}

interface TreeNodeItemProps {
  node: TreeNode;
  level: number;
  isLast: boolean;
  parentPath: boolean[];
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ node, level, isLast, parentPath }) => {
  const [isOpen, setIsOpen] = useState(level < 3);
  const hasChildren = node.children && node.children.length > 0;

  const toggleOpen = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    }
  };

  // Build the tree connector lines
  const renderConnectors = () => {
    const connectors = [];
    
    for (let i = 0; i < level; i++) {
      connectors.push(
        <span key={i} className="tree-connector inline-block w-4 text-center">
          {parentPath[i] ? '│' : ' '}
        </span>
      );
    }
    
    connectors.push(
      <span key="last" className="tree-connector inline-block w-4 text-center">
        {isLast ? '└' : '├'}
      </span>
    );
    
    return connectors;
  };

  return (
    <div className="select-none">
      <div 
        className={cn(
          "tree-node group",
          hasChildren && "cursor-pointer"
        )}
        onClick={toggleOpen}
      >
        {level > 0 && (
          <span className="font-mono text-muted-foreground/60 whitespace-pre">
            {renderConnectors()}
          </span>
        )}
        
        {hasChildren ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 folder-icon flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 folder-icon flex-shrink-0" />
          )
        ) : (
          <Folder className="w-4 h-4 folder-icon flex-shrink-0" />
        )}
        
        <span className="text-foreground truncate">{node.name}</span>
        
        {hasChildren && (
          <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </span>
        )}
      </div>
      
      {hasChildren && isOpen && (
        <div className="animate-fade-in">
          {node.children!.map((child, index) => (
            <TreeNodeItem
              key={`${child.name}-${index}`}
              node={child}
              level={level + 1}
              isLast={index === node.children!.length - 1}
              parentPath={[...parentPath, !isLast]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView: React.FC<TreeViewProps> = ({ data, className }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma pasta organizada ainda</p>
        <p className="text-xs mt-1">Processe algumas fotos para ver a estrutura</p>
      </div>
    );
  }

  return (
    <div className={cn("font-mono text-sm", className)}>
      {data.map((node, index) => (
        <TreeNodeItem
          key={`${node.name}-${index}`}
          node={node}
          level={0}
          isLast={index === data.length - 1}
          parentPath={[]}
        />
      ))}
    </div>
  );
};

export default TreeView;
