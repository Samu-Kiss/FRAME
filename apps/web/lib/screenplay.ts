import { Node, mergeAttributes } from "@tiptap/core"

// Screenplay block node (§4.3): one node type, `blockType` attr picks the
// format. Enter advances to the natural next block; Tab cycles types.

export const SCREENPLAY_TYPES = [
  "sceneHeading", "action", "character", "dialogue", "parenthetical", "transition",
] as const
export type ScreenplayType = (typeof SCREENPLAY_TYPES)[number]

export const SCREENPLAY_LABEL: Record<ScreenplayType, string> = {
  sceneHeading: "Scene Heading",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
}

// What Enter creates after each block — mirrors screenwriting apps.
const NEXT_ON_ENTER: Record<string, ScreenplayType> = {
  sceneHeading: "action",
  action: "action",
  character: "dialogue",
  dialogue: "character",
  parenthetical: "dialogue",
  transition: "sceneHeading",
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    screenplayBlock: {
      setScreenplayType: (type: ScreenplayType) => ReturnType
    }
  }
}

export const ScreenplayBlock = Node.create({
  name: "screenplayBlock",
  group: "block",
  content: "text*",
  defining: true,

  addAttributes() {
    return {
      blockType: {
        default: "action",
        parseHTML: (el) => el.getAttribute("data-block-type") ?? "action",
        renderHTML: (attrs) => ({ "data-block-type": attrs.blockType }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "p[data-block-type]" }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { class: `sp-block sp-${node.attrs.blockType}` }), 0]
  },

  addCommands() {
    return {
      setScreenplayType:
        (type) =>
        ({ commands }) =>
          commands.updateAttributes("screenplayBlock", { blockType: type }),
    }
  },

  addKeyboardShortcuts() {
    const cycle = (dir: 1 | -1) => () => {
      const current = this.editor.state.selection.$from.parent.attrs.blockType as ScreenplayType
      const idx = SCREENPLAY_TYPES.indexOf(current)
      const next = SCREENPLAY_TYPES[(idx + dir + SCREENPLAY_TYPES.length) % SCREENPLAY_TYPES.length]!
      return this.editor.commands.setScreenplayType(next)
    }
    const shortcuts: Record<string, () => boolean> = {
      Enter: () => {
        const current = this.editor.state.selection.$from.parent.attrs.blockType as string
        const next = NEXT_ON_ENTER[current] ?? "action"
        return this.editor
          .chain()
          .splitBlock()
          .updateAttributes("screenplayBlock", { blockType: next })
          .run()
      },
      Tab: cycle(1),
      "Shift-Tab": cycle(-1),
    }
    SCREENPLAY_TYPES.forEach((type, i) => {
      shortcuts[`Mod-${i + 1}`] = () => this.editor.commands.setScreenplayType(type)
    })
    return shortcuts
  },
})
