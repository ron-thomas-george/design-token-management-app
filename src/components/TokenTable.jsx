import React, { useState, useRef, useEffect } from 'react'
import { MoreVertical, Edit, Trash2, Palette, Type, Move, CornerUpLeft, Zap } from 'lucide-react'

const TOKEN_TYPE_ICONS = {
  color: Palette,
  typography: Type,
  spacing: Move,
  'border-radius': CornerUpLeft,
  shadow: Zap
}

const ContextMenu = ({ isOpen, onClose, onEdit, onDelete, position }) => {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="absolute bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]"
      style={{
        top: position.y,
        left: position.x,
        transform: 'translateX(-100%)'
      }}
    >
      <button
        onClick={onEdit}
        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
      >
        <Edit className="h-4 w-4" />
        <span>Edit</span>
      </button>
      <button
        onClick={onDelete}
        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </button>
    </div>
  )
}

const TokenPreview = ({ token }) => {
  if (token.type === 'color') {
    return (
      <div className="flex items-center space-x-2">
        <div
          className="w-6 h-6 rounded border border-gray-300"
          style={{ backgroundColor: token.value }}
        />
        <span className="text-sm text-gray-600">{token.value}</span>
      </div>
    )
  }
  
  return <span className="text-sm text-gray-600">{token.value}</span>
}

const TokenTable = ({ tokens, onEdit, onDelete }) => {
  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    tokenId: null,
    position: { x: 0, y: 0 }
  })

  const handleContextMenu = (e, tokenId) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({
      isOpen: true,
      tokenId,
      position: {
        x: rect.right,
        y: rect.top
      }
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, tokenId: null, position: { x: 0, y: 0 } })
  }

  const handleEdit = () => {
    const token = tokens.find(t => t.id === contextMenu.tokenId)
    if (token) {
      onEdit(token)
    }
    closeContextMenu()
  }

  const handleDelete = () => {
    if (contextMenu.tokenId) {
      onDelete(contextMenu.tokenId)
    }
    closeContextMenu()
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <Palette className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No tokens</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first design token.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tokens.map((token) => {
              const IconComponent = TOKEN_TYPE_ICONS[token.type] || Palette
              return (
                <tr key={token.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{token.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 capitalize">
                        {token.type.replace('-', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TokenPreview token={token} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {token.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => handleContextMenu(e, token.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        onEdit={handleEdit}
        onDelete={handleDelete}
        position={contextMenu.position}
      />
    </div>
  )
}

export default TokenTable
