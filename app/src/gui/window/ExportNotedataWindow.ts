import tippy from "tippy.js"
import { App } from "../../App"
import { Notedata, isHoldNote } from "../../chart/sm/NoteTypes"
import { Window } from "./Window"

interface ExportNotedataOptions {
  include: Record<string, boolean>
  options: Record<string, boolean>
}

const OPTION_NAMES: Record<string, { label: string; tooltip?: string }> = {
  columnOneBased: {
    label: "1-indexed column numbers",
    tooltip: "Start counting column numbers from 0 instead of 1.",
  },
  lengthAsNumberIndex: {
    label: "Store length in integer keys",
    tooltip:
      'Store the length of holds as the last item in each table, instead of using the "length" key.',
  },
  padNumbers: {
    label: "Pad numbers",
    tooltip: "Pad decimals with trailing zeros.",
  },
  minify: { label: "Minify", tooltip: "Remove all newlines and spaces." },
  notitgNoteTypes: {
    label: "Use NotITG Note Types",
    tooltip: 'Use NotITG note types. (Tap = 1, Hold = 2, Mine = "M")',
  },
}

const NOTITG_TYPES: Record<string, string> = {
  Tap: "1",
  Hold: "2",
  Roll: "4",
  Mine: '"M"',
  Lift: '"L"',
  Fake: '"F"',
}

export class ExportNotedataWindow extends Window {
  app: App
  private selection
  private outputDiv?: HTMLPreElement
  private exportOptions: ExportNotedataOptions = {
    include: {
      Beat: true,
      Second: false,
      Column: true,
      Type: true,
      Quantization: false,
      Length: true,
    },
    options: {
      columnOneBased: false,
      lengthAsNumberIndex: false,
      padNumbers: false,
      minify: false,
      notitgNoteTypes: false,
    },
  }

  constructor(app: App, selection: Notedata = []) {
    super({
      title: "Export Notedata",
      width: 600,
      height: 400,
      disableClose: false,
      win_id: "export_notedata",
      blocking: false,
    })
    this.app = app
    if (selection.length == 0)
      selection = this.app.chartManager.loadedChart!.getNotedata()
    this.selection = selection

    this.initView()
    this.export()
  }

  initView(): void {
    // Create the window
    this.viewElement.replaceChildren()

    //Padding container
    const padding = document.createElement("div")
    padding.classList.add("padding")

    const container = document.createElement("div")
    container.classList.add("export-container")

    const options = document.createElement("div")
    options.classList.add("export-options")

    const output = document.createElement("pre")
    output.classList.add("export-output")

    tippy(output, {
      content: "Click to copy to clipboard",
    })

    tippy(output, {
      content: "Copied!",
      trigger: "click",
      onShow(instance) {
        instance.setProps({ trigger: "mouseenter" })
      },
      onHide(instance) {
        instance.setProps({ trigger: "click" })
      },
    })

    output.addEventListener("click", () => {
      navigator.clipboard.writeText(output.innerText)
    })

    this.outputDiv = output

    const includeLabel = document.createElement("div")
    includeLabel.classList.add("export-section-label")
    includeLabel.innerText = "Include"

    options.appendChild(includeLabel)

    Object.keys(this.exportOptions.include).forEach(name => {
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.id = "en-i-" + name
      checkbox.checked = this.exportOptions.include[name]
      checkbox.onchange = () => {
        this.exportOptions.include[name] = checkbox.checked
        this.export()
      }
      const optionLabel = document.createElement("label")
      optionLabel.classList.add("export-label")
      optionLabel.htmlFor = checkbox.id
      optionLabel.innerText = name

      const container = document.createElement("div")
      container.replaceChildren(checkbox, optionLabel)
      container.classList.add("export-option")
      options.appendChild(container)
    })

    const optionLabel = document.createElement("div")
    optionLabel.classList.add("export-section-label")
    optionLabel.innerText = "Options"

    options.appendChild(optionLabel)

    Object.keys(this.exportOptions.options).forEach(name => {
      const checkbox = document.createElement("input")
      checkbox.id = "en-o-" + name
      checkbox.type = "checkbox"
      checkbox.checked = this.exportOptions.options[name]
      checkbox.onchange = () => {
        this.exportOptions.options[name] = checkbox.checked
        this.export()
      }
      const optionLabel = document.createElement("label")
      optionLabel.classList.add("export-label")
      optionLabel.htmlFor = checkbox.id
      optionLabel.innerText = OPTION_NAMES[name].label

      const container = document.createElement("div")
      container.replaceChildren(checkbox, optionLabel)
      container.classList.add("export-option")
      options.appendChild(container)

      if (OPTION_NAMES[name].tooltip !== undefined) {
        tippy(container, {
          content: OPTION_NAMES[name].tooltip,
        })
      }
    })

    container.replaceChildren(options, output)

    padding.appendChild(container)
    this.viewElement.appendChild(padding)
  }

  private export() {
    let exportText =
      "{\n" +
      this.selection
        .map(note => {
          let str = "\t{"
          if (this.exportOptions.include.Beat)
            str += this.padNum(note.beat) + ","
          if (this.exportOptions.include.Second)
            str += this.padNum(note.second) + ","
          if (this.exportOptions.include.Column) {
            if (this.exportOptions.options.columnOneBased)
              str += note.col + 1 + ","
            else str += note.col + ","
          }
          if (this.exportOptions.include.Type) {
            if (
              this.exportOptions.options.notitgNoteTypes &&
              NOTITG_TYPES[note.type] !== undefined
            ) {
              str += NOTITG_TYPES[note.type] + ","
            } else {
              str += '"' + note.type + '",'
            }
          }
          if (this.exportOptions.include.Quantization) str += note.quant + ","
          if (this.exportOptions.include.Length && isHoldNote(note)) {
            if (this.exportOptions.options.lengthAsNumberIndex)
              str += this.padNum(note.hold) + ","
            else str += "length=" + this.padNum(note.hold) + ","
          }

          if (str.endsWith(",")) str = str.slice(0, -1)

          str += "}"

          if (this.getNumIncludes() == 1) {
            str = str.replaceAll("{", "")
            str = str.replaceAll("}", "")
          }

          return str
        })
        .join(",\n") +
      "\n}"
    if (this.exportOptions.options.minify)
      exportText = exportText.replaceAll(/\s/g, "")
    this.outputDiv!.innerText = exportText
  }

  private getNumIncludes() {
    return Object.values(this.exportOptions.include)
      .map(option => +option)
      .reduce((a, b) => a + b, 0)
  }

  private padNum(val: number) {
    if (this.exportOptions.options.padNumbers)
      return (Math.round(val * 1000) / 1000).toFixed(3)
    return Math.round(val * 1000) / 1000
  }
}
