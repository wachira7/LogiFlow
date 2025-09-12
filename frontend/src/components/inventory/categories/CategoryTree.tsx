import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Plus, Edit2, Trash2 } from 'lucide-react';
import { Category } from '@/types/inventory.types';

interface CategoryTreeProps {
  categories: Category[];
  selectedCategoryId?: string;
  onSelectCategory?: (category: Category) => void;
  onAddCategory?: (parentId?: string) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  showActions?: boolean;
}

interface CategoryTreeNodeProps {
  category: Category;
  children: Category[];
  level: number;
  selectedCategoryId?: string;
  onSelectCategory?: (category: Category) => void;
  onAddCategory?: (parentId?: string) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (categoryId: string) => void;
  showActions?: boolean;
  expandedNodes: Set<string>;
  onToggleExpand: (categoryId: string) => void;
}

const CategoryTreeNode: React.FC<CategoryTreeNodeProps> = ({
  category,
  children,
  level,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  showActions = false,
  expandedNodes,
  onToggleExpand
}) => {
  const isExpanded = expandedNodes.has(category.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedCategoryId === category.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(category.id);
    }
  };

  const handleSelect = () => {
    onSelectCategory?.(category);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddCategory?.(category.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditCategory?.(category);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteCategory?.(category.id);
  };

  return (
    <div>
      <div
        className={`flex items-center py-2 px-2 hover:bg-gray-50 cursor-pointer group ${
          isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
        onClick={handleSelect}
      >
        <div className="flex items-center min-w-0 flex-1">
          <button
            onClick={handleToggleExpand}
            className={`mr-1 p-1 hover:bg-gray-200 rounded ${
              hasChildren ? '' : 'invisible'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
          
          <div className="mr-2">
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-gray-500" />
            )}
          </div>
          
          <span className="text-sm font-medium text-gray-900 truncate">
            {category.name}
          </span>
          
          {category.description && (
            <span className="ml-2 text-xs text-gray-500 truncate">
              ({category.description})
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleAddChild}
              className="p-1 hover:bg-gray-200 rounded"
              title="Add subcategory"
            >
              <Plus className="w-3 h-3 text-gray-600" />
            </button>
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-gray-200 rounded"
              title="Edit category"
            >
              <Edit2 className="w-3 h-3 text-gray-600" />
            </button>
            {children.length === 0 && (
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-red-100 rounded"
                title="Delete category"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              category={child}
              children={getChildCategories(child.id, [])} // This would need the full category list
              level={level + 1}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={onSelectCategory}
              onAddCategory={onAddCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
              showActions={showActions}
              expandedNodes={expandedNodes}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to build category hierarchy
const buildCategoryTree = (categories: Category[]) => {
  const categoryMap = new Map<string, Category>();
  const rootCategories: Category[] = [];
  const childrenMap = new Map<string, Category[]>();

  // Build maps
  categories.forEach(category => {
    categoryMap.set(category.id, category);
    if (!childrenMap.has(category.parentId || '')) {
      childrenMap.set(category.parentId || '', []);
    }
  });

  categories.forEach(category => {
    if (category.parentId) {
      const siblings = childrenMap.get(category.parentId) || [];
      siblings.push(category);
      childrenMap.set(category.parentId, siblings);
    } else {
      rootCategories.push(category);
    }
  });

  return { rootCategories, childrenMap };
};

const getChildCategories = (parentId: string, allCategories: Category[]) => {
  return allCategories.filter(cat => cat.parentId === parentId);
};

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  showActions = false
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const { rootCategories, childrenMap } = buildCategoryTree(categories);

  const handleToggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedNodes(newExpanded);
  };

  if (categories.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Folder className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p>No categories found</p>
        {showActions && onAddCategory && (
          <button
            onClick={() => onAddCategory()}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Create your first category
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-h-96 overflow-y-auto">
        {rootCategories.map((category) => (
          <CategoryTreeNode
            key={category.id}
            category={category}
            children={childrenMap.get(category.id) || []}
            level={0}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={onSelectCategory}
            onAddCategory={onAddCategory}
            onEditCategory={onEditCategory}
            onDeleteCategory={onDeleteCategory}
            showActions={showActions}
            expandedNodes={expandedNodes}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>

      {showActions && onAddCategory && (
        <div className="border-t p-2">
          <button
            onClick={() => onAddCategory()}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Root Category
          </button>
        </div>
      )}
    </div>
  );
};