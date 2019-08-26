import * as util from '../util'
import * as images from '../assets/images'
import { Cell } from './cell'
import { View } from './view'
import { Model } from './model'
import { Geometry } from './geometry'
import { CellState } from './cell-state'
import { CellOverlay } from './cell-overlay'
import { Renderer } from './renderer'
import { Stylesheet, EdgeStyle } from '../stylesheet'
import {
  constants,
  detector,
  Events,
  DomEvent,
  CustomMouseEvent,
} from '../common'
import {
  IChange,
  RootChange,
  ChildChange,
  StyleChange,
  DataChange,
  TerminalChange,
  GeometryChange,
} from '../change'
import {
  Align,
  StyleName,
  Direction,
  Rectangle,
  Point,
  ConnectionConstraint,
  Image,
} from '../struct'
import { GraphSelectionModel } from '../handler/graph-selection-model'
import { Polyline, Label } from '../shape'

export class Graph extends Events {
  container: HTMLElement
  model: Model
  view: View
  stylesheet: Stylesheet
  selectionModel: GraphSelectionModel
  renderer: Renderer

  tooltipHandler: any
  popupMenuHandler: any
  selectionCellsHandler: any
  connectionHandler: any
  panningHandler: any
  panningManager: any
  graphHandler: any

  private verticalPageBreaks: Polyline[]
  private horizontalPageBreaks: Polyline[]

  /**
   * Holds the mouse event listeners. See <fireMouseEvent>.
   */
  mouseListeners: any[] | null

  /**
   * Holds the state of the mouse button.
   */
  isMouseDown: boolean = false
  private isMouseTrigger: boolean = false

  lastMouseX: number

  lastMouseY: number

  /**
   * Holds the <CellEditor> that is used as the in-place editing.
   */
  cellEditor: any

  /**
   * An array of <mxMultiplicities> describing the allowed
   * connections in a graph.
   */
  multiplicities: any[]

  /**
   * Dialect to be used for drawing the graph.
   */
  dialect: 'svg' | 'strictHtml' | 'preferHtml'

  /**
   * Specifies the grid size.
   */
  gridSize = 10

  /**
   * Specifies if the grid is enabled. This is used in <snap>.
   */
  gridEnabled = true

  /**
   * Specifies if ports are enabled. This is used in <cellConnected> to update
   * the respective style. Default is true.
   */
  portsEnabled = true

  /**
   * Specifies if native double click events should be detected. Default is true.
   */
  nativeDblClickEnabled = true

  /**
   * Specifies if double taps on touch-based devices should be handled as a
   * double click. Default is true.
   */
  doubleTapEnabled = true

  /**
   * Specifies the timeout for double taps and non-native double clicks. Default
   * is 500 ms.
   */
  doubleTapTimeout = 500

  /**
   * Specifies the tolerance for double taps and double clicks in quirks mode.
   * Default is 25 pixels.
   */
  doubleTapTolerance = 25

  /**
   * Specifies if tap and hold should be used for starting connections on touch-based
   * devices. Default is true.
   */
  tapAndHoldEnabled = true

  /**
   * Specifies the time for a tap and hold. Default is 500 ms.
   */
  tapAndHoldDelay = 500

  /**
   * True if the timer for tap and hold events is running.
   */
  tapAndHoldInProgress = false

  /**
   * True as long as the timer is running and the touch events
   * stay within the given <tapAndHoldTolerance>.
   */
  tapAndHoldValid = false

  /**
   * Holds the x-coordinate of the intial touch event for tap and hold.
   */
  initialTouchX = 0

  /**
   * Holds the y-coordinate of the intial touch event for tap and hold.
   */
  initialTouchY = 0

  /**
   * Tolerance for a move to be handled as a single click.
   * Default is 4 pixels.
   */
  tolerance = 4

  /**
   * Value returned by <getOverlap> if <isAllowOverlapParent> returns
   * true for the given cell. <getOverlap> is used in <constrainChild> if
   * <isConstrainChild> returns true. The value specifies the
   * portion of the child which is allowed to overlap the parent.
   */
  defaultOverlap = 0.5

  /**
   * Specifies the default parent to be used to insert new cells.
   * This is used in <getDefaultParent>. Default is null.
   */
  defaultParent: Cell | null

  /**
   * Specifies the alternate edge style to be used if the main control point
   * on an edge is being doubleclicked. Default is null.
   */
  alternateEdgeStyle = null

  /**
   * Specifies the <mxImage> to be returned by <getBackgroundImage>. Default
   * is null.
   *
   * Example:
   *
   * (code)
   * var img = new mxImage('http://www.example.com/maps/examplemap.jpg', 1024, 768);
   * graph.setBackgroundImage(img);
   * graph.view.validate();
   * (end)
   */
  backgroundImage: Image

  /**
   * Specifies if the background page should be visible. Default is false.
   */
  pageVisible = false

  /**
   * Specifies if a dashed line should be drawn between multiple pages. Default
   * is false. If you change this value while a graph is being displayed then you
   * should call <sizeDidChange> to force an update of the display.
   */
  pageBreaksVisible = false

  /**
   * Specifies the color for page breaks. Default is 'gray'.
   */
  pageBreakColor = 'gray'

  /**
   * Specifies the page breaks should be dashed. Default is true.
   */
  pageBreakDashed = true

  /**
   * Specifies the minimum distance for page breaks to be visible. Default is
   * 20 (in pixels).
   */
  minPageBreakDist = 20

  /**
   * Specifies if the graph size should be rounded to the next page number in
   * <sizeDidChange>. This is only used if the graph container has scrollbars.
   * Default is false.
   */
  preferPageSize = false

  /**
   * Specifies the page format for the background page. Default is
   * <constants.PAGE_FORMAT_A4_PORTRAIT>. This is used as the default in
   * <mxPrintPreview> and for painting the background page if <pageVisible> is
   * true and the pagebreaks if <pageBreaksVisible> is true.
   */
  pageFormat = constants.PAGE_FORMAT_A4_PORTRAIT

  /**
   * Specifies the scale of the background page. Default is 1.5.
   * Not yet implemented.
   */
  pageScale = 1.5

  /**
   * Specifies the return value for <isEnabled>. Default is true.
   */
  enabled = true

  /**
   * Specifies if <mxKeyHandler> should invoke <escape> when the escape key
   * is pressed. Default is true.
   */
  escapeEnabled = true

  /**
   * If true, when editing is to be stopped by way of selection changing,
   * data in diagram changing or other means stopCellEditing is invoked, and
   * changes are saved. This is implemented in a focus handler in
   * <CellEditor>. Default is true.
   */
  invokesStopCellEditing = true

  /**
   * If true, pressing the enter key without pressing control or shift will stop
   * editing and accept the new value. This is used in <CellEditor> to stop
   * cell editing. Note: You can always use F2 and escape to stop editing.
   * Default is false.
   */
  enterStopsCellEditing = false

  /**
   * Specifies if scrollbars should be used for panning in <panGraph> if
   * any scrollbars are available. If scrollbars are enabled in CSS, but no
   * scrollbars appear because the graph is smaller than the container size,
   * then no panning occurs if this is true. Default is true.
   */
  useScrollbarsForPanning = true

  /**
   * Specifies the return value for <canExportCell>. Default is true.
   */
  exportEnabled = true

  /**
   * Specifies the return value for <canImportCell>. Default is true.
   */
  importEnabled = true

  /**
   * Specifies the return value for <isCellLocked>. Default is false.
   */
  cellsLocked = false

  /**
   * Specifies the return value for <isCellCloneable>. Default is true.
   */
  cellsCloneable = true

  /**
   * Specifies if folding (collapse and expand via an image icon in the graph
   * should be enabled). Default is true.
   */
  foldingEnabled = true

  /**
   * Specifies the return value for <isCellEditable>. Default is true.
   */
  cellsEditable = true

  /**
   * Specifies the return value for <isCellDeletable>. Default is true.
   */
  cellsDeletable = true

  /**
   * Specifies the return value for <isCellMovable>. Default is true.
   */
  cellsMovable = true

  /**
   * Specifies the return value for edges in <isLabelMovable>. Default is true.
   */
  edgeLabelsMovable = true

  /**
   * Specifies the return value for vertices in <isLabelMovable>. Default is false.
   */
  vertexLabelsMovable = false

  /**
   * Specifies the return value for <isDropEnabled>. Default is false.
   */
  dropEnabled = false

  /**
   * Specifies if dropping onto edges should be enabled. This is ignored if
   * <dropEnabled> is false. If enabled, it will call <splitEdge> to carry
   * out the drop operation. Default is true.
   */
  splitEnabled = true

  /**
   * Specifies the return value for <isCellResizable>. Default is true.
   */
  cellsResizable = true

  /**
   * Specifies the return value for <isCellsBendable>. Default is true.
   */
  cellsBendable = true

  /**
   * Specifies the return value for <isCellSelectable>. Default is true.
   */
  cellsSelectable = true

  /**
   * Specifies the return value for <isCellDisconntable>. Default is true.
   */
  cellsDisconnectable = true

  /**
   * Specifies if the graph should automatically update the cell size after an
   * edit. This is used in <isAutoSizeCell>. Default is false.
   */
  autoSizeCells = false

  /**
   * Specifies if autoSize style should be applied when cells are added. Default is false.
   */
  autoSizeCellsOnAdd = false

  /**
   * Specifies if the graph should automatically scroll if the mouse goes near
   * the container edge while dragging. This is only taken into account if the
   * container has scrollbars. Default is true.
   *
   * If you need this to work without scrollbars then set <ignoreScrollbars> to
   * true. Please consult the <ignoreScrollbars> for details. In general, with
   * no scrollbars, the use of <allowAutoPanning> is recommended.
   */
  autoScroll = true

  /**
   * Specifies if the graph should automatically scroll regardless of the
   * scrollbars. This will scroll the container using positive values for
   * scroll positions (ie usually only rightwards and downwards). To avoid
   * possible conflicts with panning, set <translateToScrollPosition> to true.
   */
  ignoreScrollbars = false

  /**
   * Specifies if the graph should automatically convert the current scroll
   * position to a translate in the graph view when a mouseUp event is received.
   * This can be used to avoid conflicts when using <autoScroll> and
   * <ignoreScrollbars> with no scrollbars in the container.
   */
  translateToScrollPosition = false

  /**
   * Specifies if autoscrolling should be carried out via mxPanningManager even
   * if the container has scrollbars. This disables <scrollPointToVisible> and
   * uses <mxPanningManager> instead. If this is true then <autoExtend> is
   * disabled. It should only be used with a scroll buffer or when scollbars
   * are visible and scrollable in all directions. Default is false.
   */
  timerAutoScroll = false

  /**
   * Specifies if panning via <panGraph> should be allowed to implement autoscroll
   * if no scrollbars are available in <scrollPointToVisible>. To enable panning
   * inside the container, near the edge, set <mxPanningManager.border> to a
   * positive value. Default is false.
   */
  allowAutoPanning = false

  /**
   * Specifies if the size of the graph should be automatically extended if the
   * mouse goes near the container edge while dragging. This is only taken into
   * account if the container has scrollbars. Default is true. See <autoScroll>.
   */
  autoExtend = true

  /**
   * <Rect> that specifies the area in which all cells in the diagram
   * should be placed. Uses in <getMaximumGraphBounds>. Use a width or height of
   * 0 if you only want to give a upper, left corner.
   */
  maximumGraphBounds: Rectangle | null

  /**
   * <Rect> that specifies the minimum size of the graph. This is ignored
   * if the graph container has no scrollbars. Default is null.
   */
  minimumGraphSize: Rectangle | null

  /**
   * <Rect> that specifies the minimum size of the <container> if
   * <resizeContainer> is true.
   */
  minimumContainerSize: Rectangle | null

  /**
   * <Rect> that specifies the maximum size of the container if
   * <resizeContainer> is true.
   */
  maximumContainerSize: Rectangle | null

  /**
   * Specifies if the container should be resized to the graph size when
   * the graph size has changed. Default is false.
   */
  resizeContainer: boolean = false

  /**
   * Border to be added to the bottom and right side when the container is
   * being resized after the graph has been changed. Default is 0.
   */
  border = 0

  /**
   * Specifies if edges should appear in the foreground regardless of their order
   * in the model. If <keepEdgesInForeground> and <keepEdgesInBackground> are
   * both true then the normal order is applied. Default is false.
   */
  keepEdgesInForeground = false

  /**
   * Specifies if edges should appear in the background regardless of their order
   * in the model. If <keepEdgesInForeground> and <keepEdgesInBackground> are
   * both true then the normal order is applied. Default is false.
   */
  keepEdgesInBackground = false

  /**
   * Specifies if negative coordinates for vertices are allowed. Default is true.
   */
  allowNegativeCoordinates = true

  /**
   * Specifies if a child should be constrained inside the parent bounds after a
   * move or resize of the child. Default is true.
   */
  constrainChildren = true

  /**
   * Specifies if child cells with relative geometries should be constrained
   * inside the parent bounds, if <constrainChildren> is true, and/or the
   * <maximumGraphBounds>. Default is false.
   */
  constrainRelativeChildren = false

  /**
   * Specifies if a parent should contain the child bounds after a resize of
   * the child. Default is true. This has precedence over <constrainChildren>.
   */
  extendParents = true

  /**
   * Specifies if parents should be extended according to the <extendParents>
   * switch if cells are added. Default is true.
   */
  extendParentsOnAdd = true

  /**
   * Specifies if parents should be extended according to the <extendParents>
   * switch if cells are added. Default is false for backwards compatiblity.
   */
  extendParentsOnMove = false

  /**
   * Specifies the return value for <isRecursiveResize>. Default is
   * false for backwards compatiblity.
   */
  recursiveResize = false

  /**
   * Specifies if the cell size should be changed to the preferred size when
   * a cell is first collapsed. Default is true.
   */
  collapseToPreferredSize = true

  /**
   * Specifies the factor used for <zoomIn> and <zoomOut>. Default is 1.2
   * (120%).
   */
  zoomFactor = 1.2

  /**
   * Specifies if the viewport should automatically contain the selection cells
   * after a zoom operation. Default is false.
   */
  keepSelectionVisibleOnZoom = false

  /**
   * Specifies if the zoom operations should go into the center of the actual
   * diagram rather than going from top, left. Default is true.
   */
  centerZoom = true

  /**
   * Specifies if the scale and translate should be reset if
   * the root changes in the model.
   *
   * Default is `true`.
   */
  public resetViewOnRootChange: boolean = true

  /**
   * Specifies if edge control points should be reset after the resize of a
   * connected cell. Default is false.
   */
  resetEdgesOnResize = false

  /**
   * Specifies if edge control points should be reset after the move of a
   * connected cell. Default is false.
   */
  resetEdgesOnMove = false

  /**
   * Specifies if edge control points should be reset after the the edge has been
   * reconnected. Default is true.
   */
  resetEdgesOnConnect = true

  /**
   * Specifies if loops (aka self-references) are allowed. Default is false.
   */
  allowLoops = false

  /**
   * <EdgeStyle> to be used for loops. This is a fallback for loops if the
   * <constants.STYLE_LOOP> is undefined. Default is <EdgeStyle.Loop>.
   */
  defaultLoopStyle = EdgeStyle.loop

  /**
   * Specifies if multiple edges in the same direction between the same pair of
   * vertices are allowed. Default is true.
   */
  multigraph = true

  /**
   * Variable: connectableEdges
   *
   * Specifies if edges are connectable. Default is false. This overrides the
   * connectable field in edges.
   */
  connectableEdges = false

  /**
   * Specifies if edges with disconnected terminals are allowed in the graph.
   * Default is true.
   */
  allowDanglingEdges = true

  /**
   * Specifies if edges that are cloned should be validated and only inserted
   * if they are valid. Default is true.
   */
  cloneInvalidEdges = false

  /**
   * Specifies if edges should be disconnected from their terminals when they
   * are moved. Default is true.
   */
  disconnectOnMove = true

  /**
   * Specifies if labels should be visible. This is used in <getLabel>. Default
   * is true.
   */
  labelsVisible = true

  /**
   * Specifies the return value for <isHtmlLabel>. Default is false.
   */
  htmlLabels = false

  /**
   * Specifies if swimlanes should be selectable via the content if the
   * mouse is released. Default is true.
   */
  swimlaneSelectionEnabled = true

  /**
   * Specifies if nesting of swimlanes is allowed. Default is true.
   */
  swimlaneNesting = true

  /**
   * The attribute used to find the color for the indicator if the indicator
   * color is set to 'swimlane'. Default is <constants.STYLE_FILLCOLOR>.
   */
  swimlaneIndicatorColorAttribute = constants.STYLE_FILLCOLOR

  /**
   * Holds the list of image bundles.
   */
  imageBundles: any[]

  /**
   * Specifies the minimum scale to be applied in <fit>. Default is 0.1. Set this
   * to null to allow any value.
   */
  minFitScale = 0.1

  /**
   * Specifies the maximum scale to be applied in <fit>. Default is 8. Set this
   * to null to allow any value.
   */
  maxFitScale = 8

  /**
   * Current horizontal panning value. Default is 0.
   */
  panDx = 0

  /**
   * Current vertical panning value. Default is 0.
   */
  panDy = 0

  collapsedImage: Image = images.collapsed
  expandedImage: Image = images.expanded
  warningImage: Image = images.warning

  constructor(container: HTMLElement, options: Graph.Options = {}) {
    super()

    this.dialect = 'svg'
    if (options.renderHint === 'faster') {
      this.dialect = 'strictHtml'
    } else if (options.renderHint === 'fastest') {
      this.dialect = 'preferHtml'
    }

    this.model = options.model || new Model()
    this.view = new View(this)
    this.renderer = new Renderer()
    this.stylesheet = options.stylesheet || new Stylesheet()
    this.selectionModel = new GraphSelectionModel(this)
    this.mouseListeners = null
    this.multiplicities = []
    this.imageBundles = []

    this.model.on(Model.eventNames.change, this.graphModelChanged, this)
    this.createHandlers()

    if (container != null) {
      this.init(container)
    }
    this.view.revalidate()
  }

  private init(container: HTMLElement) {
    this.container = container
    // TODO:
    // this.cellEditor = new CellEditor(this)
    this.view.init()
    this.sizeDidChange()

    // Hides tooltips and resets tooltip timer if mouse leaves container
    DomEvent.addListener(container, 'mouseleave', () => {
      if (this.tooltipHandler != null) {
        this.tooltipHandler.hide()
      }
    })

    if (detector.IS_IE) {
      // automatic deallocation of memory
      DomEvent.addListener(window, 'unload', () => {
        this.destroy()
      })

      // disable shift-click for text
      DomEvent.addListener(container, 'selectstart', (e: MouseEvent) => {
        return (
          this.isEditing() ||
          (!this.isMouseDown && !DomEvent.isShiftDown(e))
        )
      })
    }
  }

  private createHandlers() {
    // this.tooltipHandler = this.createTooltipHandler()
    // this.tooltipHandler.setEnabled(false)
    // this.selectionCellsHandler = this.createSelectionCellsHandler()
    // this.connectionHandler = this.createConnectionHandler()
    // this.connectionHandler.setEnabled(false)
    // this.graphHandler = this.createGraphHandler()
    // this.panningHandler = this.createPanningHandler()
    // this.panningHandler.panningEnabled = false
    // this.popupMenuHandler = this.createPopupMenuHandler()
  }

  // private createTooltipHandler() {
  //   return new mxTooltipHandler(this)
  // }

  // private createSelectionCellsHandler() {
  //   return new mxSelectionCellsHandler(this)
  // }

  // private createConnectionHandler() {
  //   return new mxConnectionHandler(this)
  // }

  // private createGraphHandler() {
  //   return new mxGraphHandler(this)
  // }

  // private createPanningHandler() {
  //   return new mxPanningHandler(this)
  // }

  // private createPopupMenuHandler() {
  //   return new mxPopupMenuHandler(this)
  // }

  batchUpdate(update: () => void) {
    this.model.batchUpdate(update)
  }

  getModel() {
    return this.model
  }

  getView() {
    return this.view
  }

  getStylesheet() {
    return this.stylesheet
  }

  setStylesheet(stylesheet: Stylesheet) {
    this.stylesheet = stylesheet
  }

  getSelectionModel() {
    return this.selectionModel
  }

  setSelectionModel(selectionModel: GraphSelectionModel) {
    this.selectionModel = selectionModel
  }

  /**
   * Returns the cells to be selected for the given array of changes.
   */
  getSelectionCellsForChanges(changes: IChange[]) {
    const dict = new WeakMap<Cell, boolean>()
    const cells: Cell[] = []

    const addCell = (cell: Cell) => {
      if (!dict.get(cell) && this.model.contains(cell)) {
        if (this.model.isEdge(cell) || this.model.isNode(cell)) {
          dict.set(cell, true)
          cells.push(cell)
        } else {
          cell.eachChild(child => addCell(child))
        }
      }
    }

    changes.forEach((change) => {
      if (!(change instanceof RootChange)) {
        let cell = null

        if (change instanceof ChildChange) {
          cell = change.child
        } else {
          const tmp = (change as any).cell
          if (tmp != null && tmp instanceof Cell) {
            cell = tmp
          }
        }

        if (cell != null) {
          addCell(cell)
        }
      }
    })

    return cells
  }

  /**
   * Called when the graph model changes.
   */
  private graphModelChanged(changes: IChange[]) {
    changes.forEach(change => this.processChange(change))
    this.updateSelection()
    this.view.validate()
    this.sizeDidChange()
  }

  private processChange(change: IChange) {
    if (change instanceof RootChange) {
      // removes all cells and clears the selection if the root changes.

      this.clearSelection()
      this.setDefaultParent(null)
      this.removeStateForCell(change.previous)

      if (this.resetViewOnRootChange) {
        this.view.scale = 1
        this.view.translate.x = 0
        this.view.translate.y = 0
      }

    } else if (change instanceof ChildChange) {

      const newParent = this.model.getParent(change.child)!
      this.view.invalidate(change.child, true, true)

      // invisible
      if (
        !this.model.contains(newParent) ||
        this.isCellCollapsed(newParent)
      ) {
        this.view.invalidate(change.child, true, true)
        this.removeStateForCell(change.child)
        // currentRoot being removed
        if (this.getCurrentRoot() === change.child) {
          this.home()
        }
      }

      if (newParent !== change.previous) {
        // Refreshes the collapse/expand icons on the parents
        if (newParent != null) {
          this.view.invalidate(newParent, false, false)
        }

        if (change.previous != null) {
          this.view.invalidate(change.previous, false, false)
        }
      }
    } else if (
      change instanceof TerminalChange ||
      change instanceof GeometryChange
    ) {
      // Handles two special cases where the shape does not need to
      // be recreated from scratch, it only needs to be invalidated.

      // Checks if the geometry has changed to avoid unnessecary revalidation
      if (
        change instanceof TerminalChange || (
          (change.previous == null && change.geometry != null) ||
          (change.previous != null && !change.previous.equals(change.geometry))
        )
      ) {
        this.view.invalidate(change.cell)
      }
    } else if (change instanceof DataChange) {
      // Handles special case where only the shape, but no
      // descendants need to be recreated.

      this.view.invalidate(change.cell, false, false)
    } else if (change instanceof StyleChange) {
      // Requires a new Shape in JavaScript.

      this.view.invalidate(change.cell, true, true)
      const state = this.view.getState(change.cell)
      if (state != null) {
        state.invalidStyle = true
      }
    } else if (change.cell != null && change.cell instanceof Cell) {
      // Removes the state from the cache by default.
      this.removeStateForCell(change.cell)
    }
  }

  /**
   * Removes all cached information for the given cell and its descendants.
   * This is called when a cell was removed from the model.
   */
  private removeStateForCell(cell: Cell | null) {
    if (cell) {
      cell.eachChild(child => this.removeStateForCell(child))
      this.view.invalidate(cell, false, true)
      this.view.removeState(cell)
    }
  }

  // #region ======== Overlays

  /**
   * Adds an `CellOverlay` for the specified cell.
   */
  addCellOverlay(cell: Cell, overlay: CellOverlay) {
    if (cell.overlays == null) {
      cell.overlays = []
    }

    cell.overlays.push(overlay)

    const state = this.view.getState(cell)
    if (state != null) {
      // Immediately updates the cell display if the state exists
      this.renderer.redraw(state)
    }

    this.trigger(Graph.eventNames.addOverlay, { cell, overlay })

    return overlay
  }

  /**
   * Returns the array of `CellOverlay` for the given cell or null
   * if no overlays are defined.
   */
  getCellOverlays(cell: Cell) {
    return cell.overlays
  }

  /**
   * Removes and returns the given `CellOverlay` from the given cell.
   * If no overlay is given, then all overlays are removed.
   */
  removeCellOverlay(cell: Cell, overlay?: CellOverlay | null) {
    if (overlay == null) {
      this.removeCellOverlays(cell)
    } else {
      const index = util.indexOf(cell.overlays, overlay)
      if (index >= 0 && cell.overlays != null) {
        cell.overlays.splice(index, 1)
        if (cell.overlays.length === 0) {
          cell.overlays = null
        }

        const state = this.view.getState(cell)
        if (state != null) {
          this.renderer.redraw(state)
        }

        this.trigger(Graph.eventNames.removeOverlay, { cell, overlay })
      } else {
        // tslint:disable-next-line
        overlay = null
      }
    }

    return overlay
  }

  removeCellOverlays(cell: Cell) {
    const overlays = cell.overlays
    if (overlays != null) {
      cell.overlays = null

      const state = this.view.getState(cell)
      if (state != null) {
        this.renderer.redraw(state)
      }

      this.trigger(Graph.eventNames.removeOverlays, { cell, overlays })
    }

    return overlays
  }

  /**
   * Removes all `CellOverlays` in the graph for the given cell and all its
   * descendants. If no cell is specified then all overlays are removed from
   * the graph.
   */
  clearCellOverlays(cell: Cell = this.model.getRoot()) {
    this.removeCellOverlays(cell)
    cell.eachChild(child => this.clearCellOverlays(child))
  }

  /**
   * Creates an overlay for the given cell using the `warning` string and
   * image `warningImage`, then returns the new `CellOverlay`. The `warning`
   * string is displayed as a tooltip in a red font and may contain HTML
   * markup. If the `warning` string is null or a zero length string, then
   * all overlays are removed from the cell.
   */
  setCellWarning(
    cell: Cell,
    warning?: string | null,
    img: Image = this.warningImage,
    selectOnClick: boolean = false,
  ) {
    if (warning != null && warning.length > 0) {
      // Creates the overlay with the image and warning
      const overlay = new CellOverlay(
        img,
        `<font color=red>${warning}</font>`,
      )

      // Adds a handler for single mouseclicks to select the cell
      // if (selectOnClick) {
      // TODO:
      //   overlay.addListener('click', () => {
      //     if (this.isEnabled()) {
      //       this.setSelectionCell(cell)
      //     }
      //   })
      // }

      return this.addCellOverlay(cell, overlay)
    }

    this.removeCellOverlays(cell)

    return null
  }

  // #endregion

  // #region ======== In-place Editing

  startEditing(e?: MouseEvent) {
    this.startEditingAtCell(null, e)
  }

  startEditingAtCell(cell?: Cell | null, e?: MouseEvent) {
    if (e == null || !DomEvent.isMultiTouchEvent(e)) {
      if (cell == null) {
        cell = this.getSelectionCell() // tslint:disable-line
        if (cell != null && !this.isCellEditable(cell)) {
          cell = null // tslint:disable-line
        }
      }

      if (cell != null) {
        this.trigger(Graph.eventNames.startEditing, { cell, e })
        // TODO:
        // this.cellEditor.startEditing(cell, e)
        this.trigger(Graph.eventNames.editingStarted, { cell, e })
      }
    }
  }

  /**
   * Returns the initial value for in-place editing.
   */
  getEditingValue(cell: Cell, e?: MouseEvent) {
    return this.convertValueToString(cell)
  }

  stopEditing(cancel: boolean = false) {
    // TOOD:
    // this.cellEditor.stopEditing(cancel)
    this.trigger(Graph.eventNames.editingStopped, { cancel })
  }

  labelChanged(cell: Cell, value: string, e?: MouseEvent) {
    this.model.batchUpdate(() => {
      const old = cell.data
      this.cellLabelChanged(cell, value, this.isAutoSizeCell(cell))
      this.trigger(Graph.eventNames.labelChanged, { cell, value, old, e })
    })
    return cell
  }

  cellLabelChanged(cell: Cell, value: string, autoSize: boolean) {
    this.model.batchUpdate(() => {
      this.model.setData(cell, value)
      if (autoSize) {
        this.cellSizeUpdated(cell, false)
      }
    })
  }

  // #endregion

  // #region ======== Event processing

  /**
   * Processes an escape keystroke.
   */
  escape(e: KeyboardEvent) {
    this.trigger(Graph.eventNames.escape, { e })
  }

  /**
   * Processes a singleclick on an optional cell and fires a <click> event.
   * The click event is fired initially. If the graph is enabled and the
   * event has not been consumed, then the cell is selected using
   * <selectCellForEvent> or the selection is cleared using
   * <clearSelection>. The events consumed state is set to true if the
   * corresponding <mxMouseEvent> has been consumed.
   */
  click(e: CustomMouseEvent) {
    const evt = e.getEvent()
    let cell = e.getCell()

    this.trigger('click', { e })

    // Handles the event if it has not been consumed
    if (this.isEnabled() && !DomEvent.isConsumed(evt)) {
      if (cell != null) {
        if (this.isTransparentClickEvent(evt)) {
          let active = false

          const tmp = this.getCellAt(
            e.graphX,
            e.graphY,
            null,
            false,
            false,
            (state: CellState) => {
              const selected = this.isCellSelected(state.cell)
              active = active || selected
              return !active || selected
            },
          )

          if (tmp != null) {
            cell = tmp
          }
        }

        this.selectCellForEvent(cell, evt)
      } else {
        let swimlane = null

        if (this.isSwimlaneSelectionEnabled()) {
          // Gets the swimlane at the location (includes
          // content area of swimlanes)
          swimlane = this.getSwimlaneAt(e.getGraphX(), e.getGraphY())
        }

        // Selects the swimlane and consumes the event
        if (swimlane != null) {
          this.selectCellForEvent(swimlane, evt)
        } else if (!this.isToggleEvent(evt)) {
          // Ignores the event if the control key is pressed
          this.clearSelection()
        }
      }
    }
  }

  /**
   * Processes a doubleclick on an optional cell and fires a <dblclick>
   * event. The event is fired initially. If the graph is enabled and the
   * event has not been consumed, then <edit> is called with the given
   * cell. The event is ignored if no cell was specified.
   *
   * Example for overriding this method.
   *
   * (code)
   * graph.dblClick (evt, cell)
   * {
   *   var mxe = new DomEventObject(DomEvent.DOUBLE_CLICK, 'event', evt, 'cell', cell);
   *   this.fireEvent(mxe);
   *
   *   if (this.isEnabled() && !DomEvent.isConsumed(evt) && !mxe.isConsumed())
   *   {
   * 	   util.alert('Hello, World!');
   *     mxe.consume();
   *   }
   * }
   * (end)
   *
   * Example listener for this event.
   *
   * (code)
   * graph.addListener(DomEvent.DOUBLE_CLICK, function(sender, evt)
   * {
   *   var cell = evt.getProperty('cell');
   *   // do something with the cell and consume the
   *   // event to prevent in-place editing from start
   * });
   * (end)
   *
   * Parameters:
   *
   * evt - Mouseevent that represents the doubleclick.
   * cell - Optional <Cell> under the mousepointer.
   */
  dblClick(e: MouseEvent, cell?: Cell | null) {
    this.trigger('doubleClick', { e })
    // Handles the event if it has not been consumed
    if (
      this.isEnabled() &&
      !DomEvent.isConsumed(e) &&
      cell != null &&
      this.isCellEditable(cell) &&
      !this.isEditing(cell)
    ) {
      this.startEditingAtCell(cell, e)
      DomEvent.consume(e)
    }
  }

  /**
   * Handles the <mxMouseEvent> by highlighting the <CellState>.
   *
   * Parameters:
   *
   * me - <mxMouseEvent> that represents the touch event.
   * state - Optional <CellState> that is associated with the event.
   */
  tapAndHold(e: CustomMouseEvent) {
    const evt = e.getEvent()
    this.trigger('tapAndHold', { e })

    if (DomEvent.isConsumed(evt)) {
      // Resets the state of the panning handler
      // TODO:
      // this.panningHandler.panningTrigger = false
    }

    // Handles the event if it has not been consumed
    // if (
    //   this.isEnabled() &&
    //   !DomEvent.isConsumed(evt) &&
    //   this.connectionHandler.isEnabled()
    // ) {
    //   const state = this.view.getState(this.connectionHandler.marker.getCell(e))

    //   if (state != null) {
    //     this.connectionHandler.marker.currentColor = this.connectionHandler.marker.validColor
    //     this.connectionHandler.marker.markedState = state
    //     this.connectionHandler.marker.mark()

    //     this.connectionHandler.first = new Point(e.getGraphX(), e.getGraphY())
    //     this.connectionHandler.edgeState = this.connectionHandler.createEdgeState(e)
    //     this.connectionHandler.previous = state
    //     this.connectionHandler.fireEvent(new DomEventObject(DomEvent.START,
    //                     'state', this.connectionHandler.previous))
    //   }
    // }
  }

  /**
   * Scrolls the graph to the given point, extending
   * the graph container if specified.
   */
  scrollPointToVisible(
    x: number,
    y: number,
    extend: boolean = false,
    border: number = 20,
  ) {
    if (
      !this.timerAutoScroll && (
        this.ignoreScrollbars ||
        util.hasScrollbars(this.container)
      )
    ) {
      const c = this.container

      if (
        x >= c.scrollLeft &&
        y >= c.scrollTop &&
        x <= c.scrollLeft + c.clientWidth &&
        y <= c.scrollTop + c.clientHeight
      ) {
        let dx = c.scrollLeft + c.clientWidth - x

        if (dx < border) {
          const old = c.scrollLeft
          c.scrollLeft += border - dx

          // Automatically extends the canvas size to the bottom, right
          // if the event is outside of the canvas and the edge of the
          // canvas has been reached. Notes: Needs fix for IE.
          if (extend && old === c.scrollLeft) {
            if (this.dialect === constants.DIALECT_SVG) {
              const root = (this.view.getDrawPane() as SVGElement).ownerSVGElement!
              const width = this.container.scrollWidth + border - dx

              // Updates the clipping region. This is an expensive
              // operation that should not be executed too often.
              root.style.width = util.toPx(width)
            } else {
              const width = Math.max(c.clientWidth, c.scrollWidth) + border - dx
              const canvas = this.view.getCanvas()!
              canvas.style.width = util.toPx(width)
            }

            c.scrollLeft += border - dx
          }
        } else {
          dx = x - c.scrollLeft

          if (dx < border) {
            c.scrollLeft -= border - dx
          }
        }

        let dy = c.scrollTop + c.clientHeight - y

        if (dy < border) {
          const old = c.scrollTop
          c.scrollTop += border - dy

          if (old === c.scrollTop && extend) {
            if (this.dialect === constants.DIALECT_SVG) {
              const root = (this.view.getDrawPane() as SVGElement).ownerSVGElement!
              const height = this.container.scrollHeight + border - dy

              // Updates the clipping region. This is an expensive
              // operation that should not be executed too often.
              root.style.height = util.toPx(height)
            } else {
              const height = Math.max(c.clientHeight, c.scrollHeight) + border - dy
              const canvas = this.view.getCanvas()!
              canvas.style.height = util.toPx(height)
            }

            c.scrollTop += border - dy
          }
        } else {
          dy = y - c.scrollTop

          if (dy < border) {
            c.scrollTop -= border - dy
          }
        }
      }
    } else if (this.allowAutoPanning && !this.panningHandler.isActive()) {
      if (this.panningManager == null) {
        this.panningManager = this.createPanningManager()
      }

      this.panningManager.panTo(x + this.panDx, y + this.panDy)
    }
  }

  createPanningManager() {
    // TODO: xx
    // return new PanningManager(this)
  }

  /**
   * Returns the size of the border and padding on all four sides of the
   * container. The left, top, right and bottom borders are stored in the x, y,
   * width and height of the returned <Rect>, respectively.
   */
  getBorderSizes() {
    const css = util.getCurrentStyle(this.container)
    return new Rectangle(
      util.parseCssNumber(css.paddingLeft) +
      (css.borderLeftStyle !== 'none' ? util.parseCssNumber(css.borderLeftWidth) : 0),
      util.parseCssNumber(css.paddingTop) +
      (css.borderTopStyle !== 'none' ? util.parseCssNumber(css.borderTopWidth) : 0),
      util.parseCssNumber(css.paddingRight) +
      (css.borderRightStyle !== 'none' ? util.parseCssNumber(css.borderRightWidth) : 0),
      util.parseCssNumber(css.paddingBottom) +
      (css.borderBottomStyle !== 'none' ? util.parseCssNumber(css.borderBottomWidth) : 0))
  }

  /**
   * Returns the preferred size of the background page if <preferPageSize> is true.
   */
  getPreferredPageSize(bounds: Rectangle, width: number, height: number) {
    // const scale = this.view.scale
    const tr = this.view.translate
    const fmt = this.pageFormat
    const ps = this.pageScale
    const page = new Rectangle(0, 0, Math.ceil(fmt.width * ps), Math.ceil(fmt.height * ps))

    const hCount = (this.pageBreaksVisible) ? Math.ceil(width / page.width) : 1
    const vCount = (this.pageBreaksVisible) ? Math.ceil(height / page.height) : 1

    return new Rectangle(0, 0, hCount * page.width + 2 + tr.x, vCount * page.height + 2 + tr.y)
  }

  /**
   * Scales the graph such that the complete diagram fits into <container> and
   * returns the current scale in the view. To fit an initial graph prior to
   * rendering, set <mxGraphView.rendering> to false prior to changing the model
   * and execute the following after changing the model.
   *
   * (code)
   * graph.fit();
   * graph.view.rendering = true;
   * graph.refresh();
   * (end)
   *
   * To fit and center the graph, the following code can be used.
   *
   * (code)
   * var margin = 2;
   * var max = 3;
   *
   * var bounds = graph.getGraphBounds();
   * var cw = graph.container.clientWidth - margin;
   * var ch = graph.container.clientHeight - margin;
   * var w = bounds.width / graph.view.scale;
   * var h = bounds.height / graph.view.scale;
   * var s = Math.min(max, Math.min(cw / w, ch / h));
   *
   * graph.view.scaleAndTranslate(s,
   *   (margin + cw - w * s) / (2 * s) - bounds.x / graph.view.scale,
   *   (margin + ch - h * s) / (2 * s) - bounds.y / graph.view.scale);
   * (end)
   *
   * Parameters:
   *
   * border - Optional number that specifies the border. Default is <border>.
   * keepOrigin - Optional boolean that specifies if the translate should be
   * changed. Default is false.
   * margin - Optional margin in pixels. Default is 0.
   * enabled - Optional boolean that specifies if the scale should be set or
   * just returned. Default is true.
   * ignoreWidth - Optional boolean that specifies if the width should be
   * ignored. Default is false.
   * ignoreHeight - Optional boolean that specifies if the height should be
   * ignored. Default is false.
   * maxHeight - Optional maximum height.
   */
  fit(
    border: number = this.getBorder(),
    keepOrigin: boolean = false,
    margin: number = 0,
    enabled: boolean = true,
    ignoreWidth: boolean = false,
    ignoreHeight: boolean = false,
    maxHeight?: number,
  ) {
    if (this.container != null) {
      // Adds spacing and border from css
      const cssBorder = this.getBorderSizes()
      let w1 = this.container.offsetWidth - cssBorder.x - cssBorder.width - 1
      let h1 = maxHeight != null
        ? maxHeight
        : this.container.offsetHeight - cssBorder.y - cssBorder.height - 1
      let bounds = this.view.getGraphBounds()

      if (bounds.width > 0 && bounds.height > 0) {
        if (keepOrigin && bounds.x != null && bounds.y != null) {
          bounds = bounds.clone()
          bounds.width += bounds.x
          bounds.height += bounds.y
          bounds.x = 0
          bounds.y = 0
        }

        // LATER: Use unscaled bounding boxes to fix rounding errors
        const s = this.view.scale
        let w2 = bounds.width / s
        let h2 = bounds.height / s

        // Fits to the size of the background image if required
        if (this.backgroundImage != null) {
          w2 = Math.max(w2, this.backgroundImage.width - bounds.x / s)
          h2 = Math.max(h2, this.backgroundImage.height - bounds.y / s)
        }

        const b = ((keepOrigin) ? border : 2 * border) + margin + 1

        w1 -= b
        h1 -= b

        let s2 = (((ignoreWidth) ? h1 / h2 : (ignoreHeight) ? w1 / w2 :
          Math.min(w1 / w2, h1 / h2)))

        if (this.minFitScale != null) {
          s2 = Math.max(s2, this.minFitScale)
        }

        if (this.maxFitScale != null) {
          s2 = Math.min(s2, this.maxFitScale)
        }

        if (enabled) {
          if (!keepOrigin) {
            if (!util.hasScrollbars(this.container)) {
              const x0 = (bounds.x != null)
                ? Math.floor(this.view.translate.x - bounds.x / s + border / s2 + margin / 2)
                : border

              const y0 = (bounds.y != null)
                ? Math.floor(this.view.translate.y - bounds.y / s + border / s2 + margin / 2)
                : border

              this.view.scaleAndTranslate(s2, x0, y0)
            } else {
              this.view.setScale(s2)
              const b2 = this.getGraphBounds()

              if (b2.x != null) {
                this.container.scrollLeft = b2.x
              }

              if (b2.y != null) {
                this.container.scrollTop = b2.y
              }
            }
          } else if (this.view.scale !== s2) {
            this.view.setScale(s2)
          }
        } else {
          return s2
        }
      }
    }

    return this.view.scale
  }

  /**
   * Called when the size of the graph has changed. This implementation fires
   * a <size> event after updating the clipping region of the SVG element in
   * SVG-bases browsers.
   */
  sizeDidChange() {
    const bounds = this.getGraphBounds()

    if (this.container != null) {
      const border = this.getBorder()

      let width = Math.max(0, bounds.x + bounds.width + 2 * border * this.view.scale)
      let height = Math.max(0, bounds.y + bounds.height + 2 * border * this.view.scale)

      if (this.minimumContainerSize != null) {
        width = Math.max(width, this.minimumContainerSize.width)
        height = Math.max(height, this.minimumContainerSize.height)
      }

      if (this.resizeContainer) {
        this.doResizeContainer(width, height)
      }

      if (this.preferPageSize || (!detector.IS_IE && this.pageVisible)) {
        const size = this.getPreferredPageSize(bounds, Math.max(1, width), Math.max(1, height))

        if (size != null) {
          width = size.width * this.view.scale
          height = size.height * this.view.scale
        }
      }

      if (this.minimumGraphSize != null) {
        width = Math.max(width, this.minimumGraphSize.width * this.view.scale)
        height = Math.max(height, this.minimumGraphSize.height * this.view.scale)
      }

      width = Math.ceil(width)
      height = Math.ceil(height)

      if (this.dialect === 'svg') {
        const root = (this.view.getDrawPane() as SVGGElement).ownerSVGElement
        if (root != null) {
          root.style.minWidth = `${Math.max(1, width)}px`
          root.style.minHeight = `${Math.max(1, height)}px`
          root.style.width = '100%'
          root.style.height = '100%'
        }
      } else {
        if (detector.IS_QUIRKS) {
          // Quirks mode does not support minWidth/-Height
          this.view.updateHtmlCanvasSize(Math.max(1, width), Math.max(1, height))
        } else {
          const canvas = this.view.getCanvas()!
          canvas.style.minWidth = `${Math.max(1, width)}px`
          canvas.style.minHeight = `${Math.max(1, height)}px`
        }
      }

      this.updatePageBreaks(this.pageBreaksVisible, width, height)
    }

    this.trigger(Graph.eventNames.size, bounds)
  }

  /**
   * Resizes the container for the given graph width and height.
   */
  doResizeContainer(width: number, height: number) {
    const w = this.maximumContainerSize != null
      ? Math.min(this.maximumContainerSize.width, width)
      : width

    const h = this.maximumContainerSize != null
      ? Math.min(this.maximumContainerSize.height, height)
      : height

    this.container.style.width = `${Math.ceil(w)}px`
    this.container.style.height = `${Math.ceil(h)}px`
  }

  /**
   * Invokes from <sizeDidChange> to redraw the page breaks.
   *
   * Parameters:
   *
   * visible - Boolean that specifies if page breaks should be shown.
   * width - Specifies the width of the container in pixels.
   * height - Specifies the height of the container in pixels.
   */
  updatePageBreaks(visible: boolean, width: number, height: number) {
    const scale = this.view.scale
    const tr = this.view.translate
    const fmt = this.pageFormat
    const ps = scale * this.pageScale
    const bounds = new Rectangle(0, 0, fmt.width * ps, fmt.height * ps)

    const gb = Rectangle.clone(this.getGraphBounds())
    gb.width = Math.max(1, gb.width)
    gb.height = Math.max(1, gb.height)

    bounds.x = Math.floor((gb.x - tr.x * scale) / bounds.width) * bounds.width + tr.x * scale
    bounds.y = Math.floor((gb.y - tr.y * scale) / bounds.height) * bounds.height + tr.y * scale

    gb.width = Math.ceil((gb.width + (gb.x - bounds.x)) / bounds.width) * bounds.width
    gb.height = Math.ceil((gb.height + (gb.y - bounds.y)) / bounds.height) * bounds.height

    // Does not show page breaks if the scale is too small
    // tslint:disable-next-line
    visible = visible && Math.min(bounds.width, bounds.height) > this.minPageBreakDist

    const horizontalCount = (visible) ? Math.ceil(gb.height / bounds.height) + 1 : 0
    const verticalCount = (visible) ? Math.ceil(gb.width / bounds.width) + 1 : 0
    const right = (verticalCount - 1) * bounds.width
    const bottom = (horizontalCount - 1) * bounds.height

    if (this.horizontalPageBreaks == null && horizontalCount > 0) {
      this.horizontalPageBreaks = []
    }

    if (this.verticalPageBreaks == null && verticalCount > 0) {
      this.verticalPageBreaks = []
    }

    const drawPageBreaks = (breaks: Polyline[]) => {
      if (breaks != null) {
        const count = breaks === this.horizontalPageBreaks
          ? horizontalCount
          : verticalCount

        for (let i = 0; i <= count; i += 1) {
          const pts = breaks === this.horizontalPageBreaks
            ? [
              new Point(Math.round(bounds.x), Math.round(bounds.y + i * bounds.height)),
              new Point(Math.round(bounds.x + right), Math.round(bounds.y + i * bounds.height)),
            ]
            : [
              new Point(Math.round(bounds.x + i * bounds.width), Math.round(bounds.y)),
              new Point(Math.round(bounds.x + i * bounds.width), Math.round(bounds.y + bottom)),
            ]

          if (breaks[i] != null) {
            breaks[i].points = pts
            breaks[i].redraw()
          } else {
            const pageBreak = new Polyline(pts, this.pageBreakColor)
            pageBreak.dialect = this.dialect
            pageBreak.pointerEvents = false
            pageBreak.dashed = this.pageBreakDashed
            pageBreak.init(this.view.getBackgroundPane()!)
            pageBreak.redraw()

            breaks[i] = pageBreak
          }
        }

        for (let i = count; i < breaks.length; i += 1) {
          breaks[i].destroy()
        }

        breaks.splice(count, breaks.length - count)
      }
    }

    drawPageBreaks(this.horizontalPageBreaks)
    drawPageBreaks(this.verticalPageBreaks)
  }

  // #endregion

  // #region ======== Cell styles

  /**
   * Returns a key-value pair object representing the cell style for the
   * given cell. If no string is defined in the model that specifies the
   * style, then the default style for the cell is returned or an empty
   * object, if no style can be found.
   *
   * Note: You should try and get the cell state for the given cell and
   * use the cached style in the state before using this method.
   */
  getCellStyle(cell: Cell) {
    let style = this.model.isEdge(cell)
      ? this.stylesheet.getDefaultEdgeStyle()
      : this.stylesheet.getDefaultNodeStyle()

    // Resolves the stylename using the above as the default
    const styleStr = this.model.getStyle(cell)
    if (styleStr != null) {
      style = this.postProcessCellStyle(
        this.stylesheet.getCellStyle(styleStr, style),
      )
    }

    if (style == null) {
      style = {}
    }

    return style
  }

  /**
   * Tries to resolve the value for the image style in the image bundles and
   * turns short data URIs as defined in `ImageBundle` to data URIs as
   * defined in RFC 2397 of the IETF.
   */
  private postProcessCellStyle(style: Stylesheet.Styles) {
    if (style != null) {
      const key = style[constants.STYLE_IMAGE]
      // TODO: xx
      let image = null // this.getImageFromBundles(key)
      if (image != null) {
        style[constants.STYLE_IMAGE] = image
      } else {
        image = key
      }

      // Converts short data uris to normal data uris
      if (image != null && image.substring(0, 11) === 'data:image/') {
        if (image.substring(0, 20) === 'data:image/svg+xml,<') {
          // Required for FF and IE11
          image = image.substring(0, 19) + encodeURIComponent(image.substring(19))
        } else if (image.substring(0, 22) !== 'data:image/svg+xml,%3C') {
          const comma = image.indexOf(',')
          // add base64 encoding prefix if needed
          if (
            comma > 0 &&
            image.substring(comma - 7, comma + 1) !== ';base64,'
          ) {
            image = `${image.substring(0, comma)};base64,${image.substring(comma + 1)}`
          }
        }

        style[constants.STYLE_IMAGE] = image
      }
    }

    return style
  }

  /**
   * Sets the style of the specified cells. If no cells are given, then the
   * selection cells are changed.
   */
  setCellStyle(styleStr: string, cells: Cell[] = this.getSelectionCells()) {
    if (cells != null) {
      this.model.batchUpdate(() => {
        cells.forEach(cell => this.model.setStyle(cell, styleStr))
      })
    }
  }

  /**
   * Toggles the boolean value for the given key in the style of the given
   * cell and returns the new value as 0 or 1. If no cell is specified then
   * the selection cell is used.
   *
   * Parameter:
   *
   * key - String representing the key for the boolean value to be toggled.
   * defaultValue - Optional boolean default value if no value is defined.
   * Default is false.
   * cell - Optional <Cell> whose style should be modified. Default is
   * the selection cell.
   */
  toggleCellStyle(
    key: string,
    defaultValue: boolean = false,
    cell: Cell = this.getSelectionCell()) {
    return this.toggleCellStyles(key, defaultValue, [cell])
  }

  /**
   * Toggles the boolean value for the given key in the style of the given
   * cells and returns the new value as 0 or 1. If no cells are specified,
   * then the selection cells are used.
   */
  toggleCellStyles(
    key: string,
    defaultValue: boolean = false,
    cells: Cell[] = this.getSelectionCells(),
  ) {
    let value = null
    if (cells != null && cells.length > 0) {
      const state = this.view.getState(cells[0])
      const style = state != null ? state.style : this.getCellStyle(cells[0])

      if (style != null) {
        value = (util.getBooleanFromStyle(style, key, defaultValue)) ? '0' : '1'
        this.setCellStyles(key, value, cells)
      }
    }

    return value
  }

  /**
   * Sets the key to value in the styles of the given cells. This will modify
   * the existing cell styles in-place and override any existing assignment
   * for the given key. If no cells are specified, then the selection cells
   * are changed. If no value is specified, then the respective key is
   * removed from the styles.
   */
  setCellStyles(
    key: string,
    value: string | null,
    cells: Cell[] = this.getSelectionCells(),
  ) {
    util.setCellStyles(this.model, cells, key, value)
  }

  /**
   * Toggles the given bit for the given key in the styles of the specified
   * cells.
   */
  toggleCellStyleFlags(
    key: string,
    flag: number,
    cells: Cell[] = this.getSelectionCells(),
  ) {
    this.setCellStyleFlags(key, flag, null, cells)
  }

  /**
   * Function: setCellStyleFlags
   *
   * Sets or toggles the given bit for the given key in the styles of the
   * specified cells.
   *
   * Parameters:
   *
   * key - String representing the key to toggle the flag in.
   * flag - Integer that represents the bit to be toggled.
   * value - Boolean value to be used or null if the value should be toggled.
   * cells - Optional array of <Cells> to change the style for. Default is
   * the selection cells.
   */
  setCellStyleFlags(
    key: string,
    flag: number,
    value: boolean | null,
    cells: Cell[] = this.getSelectionCells(),
  ) {
    if (cells != null && cells.length > 0) {
      if (value == null) {
        const state = this.view.getState(cells[0])
        const style = (state != null) ? state.style : this.getCellStyle(cells[0])

        if (style != null) {
          const current = parseInt(style[key], 10) || 0
          value = !((current & flag) === flag) // tslint:disable-line
        }
      }

      util.setCellStyleFlags(this.model, cells, key, flag, !!value)
    }
  }

  // #endregion

  // #region ======== Cell alignment and orientation

  /**
   * Aligns the given cells vertically or horizontally according to the given
   * alignment using the optional parameter as the coordinate.
   */
  alignCells(
    align: Align,
    cells: Cell[] = this.getSelectionCells(),
    param?: number,
  ) {
    if (cells != null && cells.length > 1) {
      // Finds the required coordinate for the alignment
      if (param == null) {
        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          const state = this.view.getState(cells[i])
          if (state != null && !this.model.isEdge(cells[i])) {
            if (param == null) {
              if (align === Align.center) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = state.bounds.x + state.bounds.width / 2
                break
              } else if (align === Align.right) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = state.bounds.x + state.bounds.width
              } else if (align === Align.top) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = state.bounds.y
              } else if (align === Align.middle) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = state.bounds.y + state.bounds.height / 2
                break
              } else if (align === Align.bottom) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = state.bounds.y + state.bounds.height
              } else {
                // tslint:disable-next-line:no-parameter-reassignment
                param = state.bounds.x
              }
            } else {
              if (align === Align.right) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = Math.max(param, state.bounds.x + state.bounds.width)
              } else if (align === Align.top) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = Math.min(param, state.bounds.y)
              } else if (align === Align.bottom) {
                // tslint:disable-next-line:no-parameter-reassignment
                param = Math.max(param, state.bounds.y + state.bounds.height)
              } else {
                // tslint:disable-next-line:no-parameter-reassignment
                param = Math.min(param, state.bounds.x)
              }
            }
          }
        }
      }

      // Aligns the cells to the coordinate
      if (param != null) {
        const s = this.view.scale
        this.model.beginUpdate()
        try {
          for (let i = 0, ii = cells.length; i < ii; i += 1) {
            const state = this.view.getState(cells[i])

            if (state != null) {
              let geo = this.getCellGeometry(cells[i])

              if (geo != null && !this.model.isEdge(cells[i])) {
                geo = geo.clone()

                if (align === Align.center) {
                  geo.bounds.x += (param - state.bounds.x - state.bounds.width / 2) / s
                } else if (align === Align.right) {
                  geo.bounds.x += (param - state.bounds.x - state.bounds.width) / s
                } else if (align === Align.top) {
                  geo.bounds.y += (param - state.bounds.y) / s
                } else if (align === Align.middle) {
                  geo.bounds.y += (param - state.bounds.y - state.bounds.height / 2) / s
                } else if (align === Align.bottom) {
                  geo.bounds.y += (param - state.bounds.y - state.bounds.height) / s
                } else {
                  geo.bounds.x += (param - state.bounds.x) / s
                }

                this.resizeCell(cells[i], geo.bounds)
              }
            }
          }

          this.trigger(Graph.eventNames.alignCells, { align, cells })
        } finally {
          this.model.endUpdate()
        }
      }
    }

    return cells
  }

  /**
   * Toggles the style of the given edge between null (or empty) and
   * `alternateEdgeStyle`.
   */
  flipEdge(edge: Cell) {
    if (edge != null && this.alternateEdgeStyle != null) {
      this.model.beginUpdate()
      try {
        const style = this.model.getStyle(edge)
        if (style == null || style.length === 0) {
          this.model.setStyle(edge, this.alternateEdgeStyle)
        } else {
          this.model.setStyle(edge, null)
        }

        // Removes all existing control points
        this.resetEdge(edge)
        this.trigger(Graph.eventNames.flipEdge, { edge })
      } finally {
        this.model.endUpdate()
      }
    }

    return edge
  }

  // TODO:
  // addImageBundle(bundle) {
  //   this.imageBundles.push(bundle)
  // }

  // removeImageBundle(bundle) {
  //   this.imageBundles = this.imageBundles.filter(item => item !== bundle)
  // }

  // /**
  //  * Searches all `imageBundles` for the specified key and returns the value
  //  * for the first match or null if the key is not found.
  //  */
  // getImageFromBundles(key) {
  //   if (key != null) {
  //     for (let i = 0, ii = this.imageBundles.length; i < ii; i += 1) {
  //       const image = this.imageBundles[i].getImage(key)
  //       if (image != null) {
  //         return image
  //       }
  //     }
  //   }

  //   return null
  // }

  // #endregion

  // #region ======== Order

  /**
   * Moves the given cells to the front or back. The change is carried out
   * using <cellsOrdered>. This method fires <DomEvent.ORDER_CELLS> while the
   * transaction is in progress.
   *
   * Parameters:
   *
   * back - Boolean that specifies if the cells should be moved to back.
   * cells - Array of <Cells> to move to the background. If null is
   * specified then the selection cells are used.
   */
  orderCells(
    back: boolean,
    cells: Cell[] = util.sortCells(this.getSelectionCells(), true),
  ) {
    this.model.batchUpdate(() => {
      this.cellsOrdered(cells, !!back)
      this.trigger(Graph.eventNames.orderCells, { cells, back: !!back })
    })
    return cells
  }

  /**
   * Moves the given cells to the front or back.
   */
  cellsOrdered(cells: Cell[], back: boolean) {
    if (cells != null) {
      this.model.batchUpdate(() => {
        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          const parent = this.model.getParent(cells[i])!

          if (back) {
            this.model.add(parent, cells[i], i)
          } else {
            this.model.add(
              parent, cells[i],
              this.model.getChildCount(parent) - 1,
            )
          }
        }
        this.trigger(Graph.eventNames.cellsOrdered, { cells, back: !!back })
      })
    }
  }

  // #endregion

  // #region ======== Grouping

  /**
   * Adds the cells into the given group. The change is carried out using
   * <cellsAdded>, <cellsMoved> and <cellsResized>. This method fires
   * <DomEvent.GROUP_CELLS> while the transaction is in progress. Returns the
   * new group. A group is only created if there is at least one entry in the
   * given array of cells.
   *
   * Parameters:
   *
   * group - <Cell> that represents the target group. If null is specified
   * then a new group is created using <createGroupCell>.
   * border - Optional integer that specifies the border between the child
   * area and the group bounds. Default is 0.
   * cells - Optional array of <Cells> to be grouped. If null is specified
   * then the selection cells are used.
   */
  groupCells(
    group: Cell,
    border: number = 0,
    cells: Cell[] = util.sortCells(this.getSelectionCells(), true),
  ) {

    // tslint:disable-next-line
    cells = this.getCellsForGroup(cells)

    if (group == null) {
      // tslint:disable-next-line
      group = this.createGroupCell(cells)
    }

    const bounds = this.getBoundsForGroup(group, cells, border)

    if (cells.length > 0 && bounds != null) {
      // Uses parent of group or previous parent of first child
      let parent = this.model.getParent(group)
      if (parent == null) {
        parent = this.model.getParent(cells[0])
      }

      this.model.batchUpdate(() => {
        // Checks if the group has a geometry and
        // creates one if one does not exist
        if (this.getCellGeometry(group) == null) {
          this.model.setGeometry(group, new Geometry())
        }

        // Adds the group into the parent
        let index = this.model.getChildCount(parent!)
        this.cellsAdded([group], parent!, index, null, null, false, false, false)

        // Adds the children into the group and moves
        index = this.model.getChildCount(group)
        this.cellsAdded(cells, group, index, null, null, false, false, false)
        this.cellsMoved(cells, -bounds.x, -bounds.y, false, false, false)

        // Resizes the group
        this.cellsResized([group], [bounds], false)

        this.trigger(Graph.eventNames.groupCells, { group, cells, border })
      })
    }

    return group
  }

  /**
   * Returns the cells with the same parent as the first cell
   * in the given array.
   */
  private getCellsForGroup(cells: Cell[]) {
    const result = []

    if (cells != null && cells.length > 0) {
      const parent = this.model.getParent(cells[0])
      result.push(cells[0])

      // Filters selection cells with the same parent
      for (let i = 1, ii = cells.length; i < ii; i += 1) {
        if (this.model.getParent(cells[i]) === parent) {
          result.push(cells[i])
        }
      }
    }

    return result
  }

  /**
   * Returns the bounds to be used for the given group and children.
   */
  private getBoundsForGroup(group: Cell, children: Cell[], border: number) {
    const result = this.getBoundingBoxFromGeometry(children, true)
    if (result != null) {
      if (this.isSwimlane(group)) {
        const size = this.getStartSize(group)

        result.x -= size.width
        result.y -= size.height
        result.width += size.width
        result.height += size.height
      }

      // Adds the border
      if (border != null) {
        result.x -= border
        result.y -= border
        result.width += 2 * border
        result.height += 2 * border
      }
    }

    return result
  }

  /**
   * Hook for creating the group cell to hold the given array of <Cells> if
   * no group cell was given to the <group> function.
   *
   * 设计一种钩子机制
   */
  private createGroupCell(cells: Cell[]) {
    const group = new Cell()
    group.actAsNode(true)
    group.setConnectable(false)
    return group
  }

  /**
   * Ungroups the given cells by moving the children the children to their
   * parents parent and removing the empty groups. Returns the children that
   * have been removed from the groups.
   *
   * Parameters:
   *
   * cells - Array of cells to be ungrouped. If null is specified then the
   * selection cells are used.
   */
  ungroupCells(cells: Cell[] = this.getSelectionCells()) {
    let result: Cell[] = []

    // tslint:disable-next-line
    cells = cells.filter(cell => this.model.getChildCount(cell) > 0)

    if (cells != null && cells.length > 0) {
      this.model.batchUpdate(() => {
        cells.forEach((cell) => {
          let children = this.model.getChildren(cell)
          if (children != null && children.length > 0) {
            children = children.slice()
            const parent = this.model.getParent(cell)!
            const index = this.model.getChildCount(parent)

            this.cellsAdded(children, parent, index, null, null, true)
            result = result.concat(children)
          }
        })

        this.removeCellsAfterUngroup(cells)
        this.trigger(Graph.eventNames.ungroupCells, { cells })
      })
    }

    return result
  }

  /**
   * Hook to remove the groups after <ungroupCells>.
   */
  removeCellsAfterUngroup(cells: Cell[]) {
    this.cellsRemoved(this.addAllEdges(cells))
  }

  /**
   * Removes the specified cells from their parents and adds them to the
   * default parent. Returns the cells that were removed from their parents.
   */
  removeCellsFromParent(cells: Cell[] = this.getSelectionCells()) {
    this.model.batchUpdate(() => {
      const parent = this.getDefaultParent()!
      const index = this.model.getChildCount(parent)

      this.cellsAdded(cells, parent, index, null, null, true)
      this.trigger(Graph.eventNames.removeCellsFromParent, { cells })
    })

    return cells
  }

  /**
   * Updates the bounds of the given groups to include all children and returns
   * the passed-in cells. Call this with the groups in parent to child order,
   * top-most group first, the cells are processed in reverse order and cells
   * with no children are ignored.
   *
   * Parameters:
   *
   * cells - The groups whose bounds should be updated. If this is null, then
   * the selection cells are used.
   * border - Optional border to be added in the group. Default is 0.
   * moveGroup - Optional boolean that allows the group to be moved. Default
   * is false.
   * topBorder - Optional top border to be added in the group. Default is 0.
   * rightBorder - Optional top border to be added in the group. Default is 0.
   * bottomBorder - Optional top border to be added in the group. Default is 0.
   * leftBorder - Optional top border to be added in the group. Default is 0.
   */
  updateGroupBounds(
    cells: Cell[] = this.getSelectionCells(),
    border: number = 0,
    moveGroup: boolean = false,
    topBorder: number = 0,
    rightBorder: number = 0,
    bottomBorder: number = 0,
    leftBorder: number = 0,
  ) {
    this.model.beginUpdate()
    try {
      for (let i = cells.length - 1; i >= 0; i -= 1) {
        let geo = this.getCellGeometry(cells[i])
        if (geo != null) {
          const children = this.getChildCells(cells[i])

          if (children != null && children.length > 0) {
            const bounds = this.getBoundingBoxFromGeometry(children, true)

            if (bounds != null && bounds.width > 0 && bounds.height > 0) {
              let left = 0
              let top = 0

              // Adds the size of the title area for swimlanes
              if (this.isSwimlane(cells[i])) {
                const size = this.getStartSize(cells[i])
                left = size.width
                top = size.height
              }

              geo = geo.clone()

              if (moveGroup) {
                geo.bounds.x = Math.round(geo.bounds.x + bounds.x - border - left - leftBorder)
                geo.bounds.y = Math.round(geo.bounds.y + bounds.y - border - top - topBorder)
              }

              geo.bounds.width =
                Math.round(bounds.width + 2 * border + left + leftBorder + rightBorder)
              geo.bounds.height =
                Math.round(bounds.height + 2 * border + top + topBorder + bottomBorder)

              this.model.setGeometry(cells[i], geo)
              this.moveCells(
                children,
                border + left - bounds.x + leftBorder,
                border + top - bounds.y + topBorder,
              )
            }
          }
        }
      }
    } finally {
      this.model.endUpdate()
    }

    return cells
  }

  /**
   * Returns the bounding box for the given array of <Cells>. The bounding box for
   * each cell and its descendants is computed using <mxGraphView.getBoundingBox>.
   */
  getBoundingBox(cells: Cell[]) {
    let result: Rectangle | null = null

    if (cells == null || cells.length <= 0) {
      return result
    }

    cells.forEach((cell) => {
      if (this.model.isNode(cell) || this.model.isEdge(cell)) {
        const bbox = this.view.getBoundingBox(this.view.getState(cell), true)
        if (bbox != null) {
          if (result == null) {
            result = Rectangle.clone(bbox)
          } else {
            result.add(bbox)
          }
        }
      }
    })

    return result
  }

  // #endregion

  // #region ======== Cell cloning, insertion and removal

  /**
   * Returns the clone for the given cell.
   *
   * Parameters:
   *
   * cell - <Cell> to be cloned.
   * allowInvalidEdges - Optional boolean that specifies if invalid edges
   * should be cloned. Default is true.
   * mapping - Optional mapping for existing clones.
   * keepPosition - Optional boolean indicating if the position of the cells should
   * be updated to reflect the lost parent cell. Default is false.
   */
  cloneCell(
    cell: Cell,
    allowInvalidEdges: boolean = true,
    mapping: WeakMap<Cell, Cell> = new WeakMap<Cell, Cell>(),
    keepPosition: boolean = false,
  ) {
    return this.cloneCells([cell], allowInvalidEdges, mapping, keepPosition)![0]
  }

  /**
   * Returns the clones for the given cells. The clones are created recursively
   * using <mxGraphModel.cloneCells>. If the terminal of an edge is not in the
   * given array, then the respective end is assigned a terminal point and the
   * terminal is removed.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be cloned.
   * allowInvalidEdges - Optional boolean that specifies if invalid edges
   * should be cloned. Default is true.
   * mapping - Optional mapping for existing clones.
   * keepPosition - Optional boolean indicating if the position of the cells should
   * be updated to reflect the lost parent cell. Default is false.
   */
  cloneCells(
    cells: Cell[],
    allowInvalidEdges: boolean = true,
    mapping: WeakMap<Cell, Cell> = new WeakMap<Cell, Cell>(),
    keepPosition: boolean = false,
  ) {
    let clones: Cell[] | null = null

    if (cells != null) {

      // Creates a dictionary for fast lookups
      const dict = new WeakMap<Cell, boolean>()
      const tmp = []

      cells.forEach((cell) => {
        dict.set(cell, true)
        tmp.push(cell)
      })

      if (tmp.length > 0) {
        const scale = this.view.scale
        const trans = this.view.translate

        clones = this.model.cloneCells(cells, true, mapping) as Cell[]

        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          if (
            !allowInvalidEdges &&
            this.model.isEdge(clones[i]!) &&
            this.getEdgeValidationError(
              clones[i],
              this.model.getTerminal(clones[i]!, true)!,
              this.model.getTerminal(clones[i]!, false)!,
            ) != null
          ) {
            (clones as any)[i] = null
          } else {
            const geom = this.model.getGeometry(clones[i]!)
            if (geom != null) {
              const state = this.view.getState(cells[i])
              const pstate = this.view.getState(this.model.getParent(cells[i])!)

              if (state != null && pstate != null) {
                const dx = (keepPosition) ? 0 : pstate.origin.x
                const dy = (keepPosition) ? 0 : pstate.origin.y

                if (this.model.isEdge(clones[i]!)) {
                  const pts = state.absolutePoints
                  if (pts != null) {
                    // Checks if the source is cloned or sets the terminal point
                    let src = this.model.getTerminal(cells[i], true)
                    while (src != null && !dict.get(src)) {
                      src = this.model.getParent(src)
                    }

                    if (src == null && pts[0] != null) {
                      geom.setTerminalPoint(
                        new Point(
                          pts[0]!.x / scale - trans.x,
                          pts[0]!.y / scale - trans.y,
                        ),
                        true,
                      )
                    }

                    // Checks if the target is cloned or sets the terminal point
                    let trg = this.model.getTerminal(cells[i], false)

                    while (trg != null && !dict.get(trg)) {
                      trg = this.model.getParent(trg)
                    }

                    const n = pts.length - 1

                    if (trg == null && pts[n] != null) {
                      geom.setTerminalPoint(
                        new Point(
                          pts[n]!.x / scale - trans.x,
                          pts[n]!.y / scale - trans.y,
                        ),
                        false,
                      )
                    }

                    // Translates the control points
                    const points = geom.points
                    if (points != null) {
                      for (let j = 0, jj = points.length; j < jj; j += 1) {
                        points[j].x += dx
                        points[j].y += dy
                      }
                    }
                  }
                } else {
                  geom.translate(dx, dy)
                }
              }
            }
          }
        }
      } else {
        clones = []
      }
    }

    return clones
  }

  /**
   * Adds a new node into the given parent `Cell` using value as the user
   * object and the given coordinates as the `Geometry` of the new node.
   * The id and style are used for the respective properties of the new
   * `Cell`, which is returned.
   *
   * When adding new nodes from a mouse event, one should take into
   * account the offset of the graph container and the scale and translation
   * of the view in order to find the correct unscaled, untranslated
   * coordinates using <mxGraph.getPointForEvent> as follows:
   *
   * (code)
   * var pt = graph.getPointForEvent(evt);
   * var parent = graph.getDefaultParent();
   * graph.insertVertex(parent, null,
   * 			'Hello, World!', x, y, 220, 30);
   * (end)
   *
   * For adding image cells, the style parameter can be assigned as
   *
   * (code)
   * stylename;image=imageUrl
   * (end)
   *
   * See <mxGraph> for more information on using images.
   *
   * Parameters:
   *
   * parent - <Cell> that specifies the parent of the new vertex.
   * id - Optional string that defines the Id of the new vertex.
   * value - Object to be used as the user object.
   * x - Integer that defines the x coordinate of the vertex.
   * y - Integer that defines the y coordinate of the vertex.
   * width - Integer that defines the width of the vertex.
   * height - Integer that defines the height of the vertex.
   * style - Optional string that defines the cell style.
   * relative - Optional boolean that specifies if the geometry is relative.
   * Default is false.
   */
  insertNode(options: Graph.InsertNodeOptions = {}) {
    const node = this.createNode(options)
    return this.addCell(node, options.parent, options.index)
  }

  addNode(node: Cell, parent?: Cell, index?: number) {
    return this.addNodes([node], parent, index)[0]
  }

  addNodes(nodes: Cell[], parent?: Cell, index?: number) {
    return this.addCells(nodes, parent, index)
  }

  createNode(options: Graph.CreateNodeOptions = {}) {
    const geo = new Geometry(options.x, options.y, options.width, options.height)
    geo.relative = options.relative != null ? options.relative : false
    const node = new Cell(options.data, geo, options.style)
    node.setId(options.id)
    node.actAsNode(true)
    node.setConnectable(true)

    return node
  }

  /**
   * Adds a new edge into the given parent <Cell> using value as the user
   * object and the given source and target as the terminals of the new edge.
   * The id and style are used for the respective properties of the new
   * <Cell>, which is returned.
   *
   * Parameters:
   *
   * parent - <Cell> that specifies the parent of the new edge.
   * id - Optional string that defines the Id of the new edge.
   * value - JavaScript object to be used as the user object.
   * source - <Cell> that defines the source of the edge.
   * target - <Cell> that defines the target of the edge.
   * style - Optional string that defines the cell style.
   */
  insertEdge(options: Graph.InsertEdgeOptions = {}) {
    const edge = this.createEdge(options)
    return this.addEdge(
      edge,
      options.parent,
      options.sourceNode,
      options.targetNode,
      options.index,
    )
  }

  /**
   * Hook method that creates the new edge for <insertEdge>. This
   * implementation does not set the source and target of the edge, these
   * are set when the edge is added to the model.
   *
   */
  createEdge(options: Graph.CreateEdgeOptions = {}) {
    const geo = new Geometry()
    geo.relative = true

    const edge = new Cell(options.data, geo, options.style)
    edge.setId(options.id)
    edge.actAsEdge(true)

    return edge
  }

  /**
   * Adds the edge to the parent and connects it to the given source and
   * target terminals. This is a shortcut method. Returns the edge that was
   * added.
   *
   * edge - <Cell> to be inserted into the given parent.
   * parent - <Cell> that represents the new parent. If no parent is
   * given then the default parent is used.
   * source - Optional <Cell> that represents the source terminal.
   * target - Optional <Cell> that represents the target terminal.
   * index - Optional index to insert the cells at. Default is to append.
   */
  addEdge(
    edge: Cell,
    parent?: Cell,
    sourceNode?: Cell,
    targetNode?: Cell,
    index?: number,
  ) {
    return this.addCell(edge, parent, index, sourceNode, targetNode)
  }

  /**
   * Adds the cell to the parent and connects it to the given source and
   * target terminals. This is a shortcut method. Returns the cell that was
   * added.
   *
   * Parameters:
   *
   * cell - <Cell> to be inserted into the given parent.
   * parent - <Cell> that represents the new parent. If no parent is
   * given then the default parent is used.
   * index - Optional index to insert the cells at. Default is to append.
   * source - Optional <Cell> that represents the source terminal.
   * target - Optional <Cell> that represents the target terminal.
   */
  addCell(
    cell: Cell,
    parent?: Cell,
    index?: number,
    sourceNode?: Cell,
    targetNode?: Cell,
  ) {
    return this.addCells([cell], parent, index, sourceNode, targetNode)[0]
  }

  /**
   * Adds the cells to the parent at the given index, connecting each cell to
   * the optional source and target terminal. The change is carried out using
   * <cellsAdded>. This method fires <DomEvent.ADD_CELLS> while the
   * transaction is in progress. Returns the cells that were added.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be inserted.
   * parent - <Cell> that represents the new parent. If no parent is
   * given then the default parent is used.
   * index - Optional index to insert the cells at. Default is to append.
   * source - Optional source <Cell> for all inserted cells.
   * target - Optional target <Cell> for all inserted cells.
   */
  addCells(
    cells: Cell[],
    parent: Cell = this.getDefaultParent()!,
    index: number = this.model.getChildCount(parent),
    sourceNode?: Cell,
    targetNode?: Cell,
  ) {
    this.model.batchUpdate(() => {
      this.trigger(
        Graph.eventNames.addCells,
        { cells, parent, index, sourceNode, targetNode },
      )

      this.cellsAdded(
        cells, parent, index, sourceNode, targetNode, false, true,
      )
    })

    return cells
  }

  private cellsAdded(
    cells: Cell[],
    parent: Cell,
    index: number,
    sourceNode?: Cell | null,
    targetNode?: Cell | null,
    absolute?: boolean,
    constrain?: boolean,
    extend?: boolean,
  ) {
    if (cells != null && parent != null && index != null) {
      this.model.batchUpdate(() => {
        const parentState = absolute ? this.view.getState(parent) : null
        const o1 = (parentState != null) ? parentState.origin : null
        const zero = new Point(0, 0)

        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          if (cells[i] == null) {
            // tslint:disable-next-line
            index -= 1
          } else {
            const previous = this.model.getParent(cells[i])

            // Keeps the cell at its absolute location
            if (o1 != null && cells[i] !== parent && parent !== previous) {
              const oldState = this.view.getState(previous!)
              const o2 = (oldState != null) ? oldState.origin : zero
              let geo = this.model.getGeometry(cells[i])

              if (geo != null) {
                const dx = o2.x - o1.x
                const dy = o2.y - o1.y

                // TODO: Cells should always be inserted first before any other edit
                // to avoid forward references in sessions.
                geo = geo.clone()
                geo.translate(dx, dy)

                if (!geo.relative && this.model.isNode(cells[i]) &&
                  !this.isAllowNegativeCoordinates()) {
                  geo.bounds.x = Math.max(0, geo.bounds.x)
                  geo.bounds.y = Math.max(0, geo.bounds.y)
                }

                this.model.setGeometry(cells[i], geo)
              }
            }

            // Decrements all following indices
            // if cell is already in parent
            if (
              parent === previous &&
              index + i > this.model.getChildCount(parent)
            ) {
              index -= 1 // tslint:disable-line
            }

            this.model.add(parent, cells[i], index + i)

            if (this.autoSizeCellsOnAdd) {
              this.autoSizeCell(cells[i], true)
            }

            // Extends the parent or constrains the child
            if (
              (extend == null || extend) &&
              this.isExtendParentsOnAdd(cells[i]!) &&
              this.isExtendParent(cells[i])
            ) {
              this.extendParent(cells[i])
            }

            // Additionally constrains the child after extending the parent
            if (constrain == null || constrain) {
              this.constrainChild(cells[i])
            }

            // Sets the source terminal
            if (sourceNode != null) {
              this.cellConnected(cells[i], sourceNode, true)
            }

            // Sets the target terminal
            if (targetNode != null) {
              this.cellConnected(cells[i], targetNode, false)
            }
          }
        }

        this.trigger(
          Graph.eventNames.cellsAdded,
          { cells, parent, index, sourceNode, targetNode, absolute },
        )
      })
    }
  }

  /**
   * Resizes the specified cell to just fit around the its label and/or children
   *
   * Parameters:
   *
   * cell - <Cells> to be resized.
   * recurse - Optional boolean which specifies if all descendants should be
   * autosized. Default is true.
   */
  autoSizeCell(cell: Cell, recurse: boolean = true) {
    if (recurse) {
      cell.eachChild(child => this.autoSizeCell(child))
    }

    if (this.getModel().isNode(cell) && this.isAutoSizeCell(cell)) {
      this.updateCellSize(cell)
    }
  }

  /**
   * Removes the given cells from the graph including all connected edges if
   * includeEdges is true. The change is carried out using <cellsRemoved>.
   * This method fires <DomEvent.REMOVE_CELLS> while the transaction is in
   * progress. The removed cells are returned as an array.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to remove. If null is specified then the
   * selection cells which are deletable are used.
   * includeEdges - Optional boolean which specifies if all connected edges
   * should be removed as well. Default is true.
   */
  removeCells(
    cells: Cell[] = this.getDeletableCells(this.getSelectionCells()),
    includeEdges: boolean = true,
  ) {
    // Adds all edges to the cells
    if (includeEdges) {
      // FIXME: Remove duplicate cells in result or do not add if
      // in cells or descendant of cells
      cells = this.getDeletableCells(this.addAllEdges(cells)) // tslint:disable-line
    } else {
      cells = cells.slice() // tslint:disable-line

      // Removes edges that are currently not
      // visible as those cannot be updated
      const edges = this.getDeletableCells(this.getAllEdges(cells))
      const dict = new WeakMap<Cell, boolean>()

      for (let i = 0, ii = cells.length; i < ii; i += 1) {
        dict.set(cells[i], true)
      }

      for (let i = 0, ii = edges.length; i < ii; i += 1) {
        if (
          this.view.getState(edges[i]) == null &&
          !dict.get(edges[i])) {
          dict.set(edges[i], true)
          cells.push(edges[i])
        }
      }
    }

    this.model.batchUpdate(() => {
      this.cellsRemoved(cells)
      this.trigger(Graph.eventNames.removeCells, { cells, includeEdges })
    })

    return cells
  }

  private cellsRemoved(cells: Cell[]) {
    if (cells != null && cells.length > 0) {
      const scale = this.view.scale
      const trans = this.view.translate

      this.model.batchUpdate(() => {
        // Creates hashtable for faster lookup
        const dict = new WeakMap<Cell, boolean>()

        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          dict.set(cells[i], true)
        }

        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          // Disconnects edges which are not being removed
          const edges = this.getAllEdges([cells[i]])

          const disconnectTerminal = (edge: Cell, isSource: boolean) => {
            let geo = this.model.getGeometry(edge)

            if (geo != null) {
              // Checks if terminal is being removed
              const terminal = this.model.getTerminal(edge, isSource)
              let connected = false
              let tmp = terminal

              while (tmp != null) {
                if (cells[i] === tmp) {
                  connected = true
                  break
                }

                tmp = this.model.getParent(tmp)
              }

              if (connected) {
                geo = geo.clone()
                const state = this.view.getState(edge)

                if (state != null && state.absolutePoints != null) {
                  const pts = state.absolutePoints
                  const n = isSource ? 0 : pts.length - 1

                  geo.setTerminalPoint(
                    new Point(
                      pts[n]!.x / scale - trans.x - state.origin.x,
                      pts[n]!.y / scale - trans.y - state.origin.y,
                    ),
                    isSource,
                  )
                } else {
                  // Fallback to center of terminal if routing
                  // points are not available to add new point
                  // KNOWN: Should recurse to find parent offset
                  // of edge for nested groups but invisible edges
                  // should be removed in removeCells step
                  const tstate = this.view.getState(terminal)

                  if (tstate != null) {
                    geo.setTerminalPoint(
                      new Point(
                        tstate.bounds.getCenterX() / scale - trans.x,
                        tstate.bounds.getCenterY() / scale - trans.y,
                      ),
                      isSource,
                    )
                  }
                }

                this.model.setGeometry(edge, geo)
                this.model.setTerminal(edge, null, isSource)
              }
            }
          }

          for (let j = 0, jj = edges.length; j < jj; j += 1) {
            if (!dict.get(edges[j])) {
              dict.set(edges[j], true)
              disconnectTerminal(edges[j], true)
              disconnectTerminal(edges[j], false)
            }
          }

          this.model.remove(cells[i])
        }

        this.trigger(Graph.eventNames.cellsRemoved, { cells })
      })
    }
  }

  /**
   * Splits the given edge by adding the newEdge between the previous source
   * and the given cell and reconnecting the source of the given edge to the
   * given cell. This method fires <DomEvent.SPLIT_EDGE> while the transaction
   * is in progress. Returns the new edge that was inserted.
   *
   * Parameters:
   *
   * edge - <Cell> that represents the edge to be splitted.
   * cells - <Cells> that represents the cells to insert into the edge.
   * newEdge - <Cell> that represents the edge to be inserted.
   * dx - Optional integer that specifies the vector to move the cells.
   * dy - Optional integer that specifies the vector to move the cells.
   */
  splitEdge(
    edge: Cell,
    cells: Cell[],
    newEdge: Cell,
    dx: number = 0,
    dy: number = 0,
  ) {

    const parent = this.model.getParent(edge)
    const source = this.model.getTerminal(edge, true)

    this.model.batchUpdate(() => {
      if (newEdge == null) {
        newEdge = this.cloneCell(edge) // tslint:disable-line

        // Removes waypoints before/after new cell
        const state = this.view.getState(edge)
        let geo = this.getCellGeometry(newEdge)

        if (geo != null && geo.points != null && state != null) {
          const t = this.view.translate
          const s = this.view.scale
          const idx = util.findNearestSegment(state, (dx + t.x) * s, (dy + t.y) * s)
          geo.points = geo.points.slice(0, idx)

          geo = this.getCellGeometry(edge)

          if (geo != null && geo.points != null) {
            geo = geo.clone()
            geo.points = geo.points.slice(idx)
            this.model.setGeometry(edge, geo)
          }
        }
      }

      this.cellsMoved(cells, dx, dy, false, false)
      this.cellsAdded(cells, parent!, this.model.getChildCount(parent), null, null, true)
      this.cellsAdded([newEdge], parent!, this.model.getChildCount(parent), source, cells[0], false)
      this.cellConnected(edge, cells[0], true)

      this.trigger(Graph.eventNames.splitEdge, { edge, cells, newEdge, dx, dy })
    })

    return newEdge
  }

  // #endregion

  // #region ======== Cell visibility

  /**
   * Sets the visible state of the specified cells and all connected edges
   * if includeEdges is true. The change is carried out using <cellsToggled>.
   * This method fires <DomEvent.TOGGLE_CELLS> while the transaction is in
   * progress. Returns the cells whose visible state was changed.
   *
   * Parameters:
   *
   * show - Boolean that specifies the visible state to be assigned.
   * cells - Array of <Cells> whose visible state should be changed. If
   * null is specified then the selection cells are used.
   * includeEdges - Optional boolean indicating if the visible state of all
   * connected edges should be changed as well. Default is true.
   */
  toggleCells(
    show: boolean,
    cells: Cell[] = this.getSelectionCells(),
    includeEdges: boolean = true,
  ) {
    if (includeEdges) {
      cells = this.addAllEdges(cells) // tslint:disable-line
    }

    this.model.batchUpdate(() => {
      this.cellsToggled(cells, show)
      this.trigger(Graph.eventNames.toggleCells, { show, cells, includeEdges })
    })

    return cells
  }

  /**
   * Sets the visible state of the specified cells.
   */
  private cellsToggled(cells: Cell[], show: boolean) {
    if (cells != null && cells.length > 0) {
      this.model.batchUpdate(() => {
        cells.forEach(cell => this.model.setVisible(cell, show))
      })
    }
  }

  // #endregion

  // #region ======== Folding

  /**
   * Sets the collapsed state of the specified cells and all descendants
   * if recurse is true. The change is carried out using <cellsFolded>.
   * This method fires <DomEvent.FOLD_CELLS> while the transaction is in
   * progress. Returns the cells whose collapsed state was changed.
   *
   * Parameters:
   *
   * collapsed - Boolean indicating the collapsed state to be assigned.
   * recurse - Optional boolean indicating if the collapsed state of all
   * descendants should be set. Default is false.
   * cells - Array of <Cells> whose collapsed state should be set. If
   * null is specified then the foldable selection cells are used.
   * checkFoldable - Optional boolean indicating of isCellFoldable should be
   * checked. Default is false.
   * evt - Optional native event that triggered the invocation.
   */
  foldCells(
    collapse: boolean,
    recurse: boolean = false,
    cells: Cell[] = this.getFoldableCells(this.getSelectionCells(), collapse),
    checkFoldable: boolean = false,
    evt?: Event,
  ) {
    this.stopEditing(false)
    this.model.batchUpdate(() => {
      this.cellsFolded(cells, collapse, recurse, checkFoldable)
      this.trigger(Graph.eventNames.foldCells, { collapse, recurse, cells })
    })
    return cells
  }

  /**
   * Sets the collapsed state of the specified cells. This method fires
   * <DomEvent.CELLS_FOLDED> while the transaction is in progress. Returns the
   * cells whose collapsed state was changed.
   *
   * Parameters:
   *
   * cells - Array of <Cells> whose collapsed state should be set.
   * collapsed - Boolean indicating the collapsed state to be assigned.
   * recurse - Boolean indicating if the collapsed state of all descendants
   * should be set.
   * checkFoldable - Optional boolean indicating of isCellFoldable should be
   * checked. Default is false.
   */
  private cellsFolded(
    cells: Cell[],
    collapse: boolean,
    recurse: boolean,
    checkFoldable: boolean = false,
  ) {
    if (cells != null && cells.length > 0) {
      this.model.batchUpdate(() => {
        cells.forEach((cell) => {
          if (
            (!checkFoldable || this.isCellFoldable(cell, collapse)) &&
            collapse !== this.isCellCollapsed(cell)
          ) {
            this.model.setCollapsed(cell, collapse)
            this.swapBounds(cell, collapse)

            if (this.isExtendParent(cell)) {
              this.extendParent(cell)
            }

            if (recurse) {
              const children = this.model.getChildren(cell)
              this.cellsFolded(children, collapse, recurse)
            }

            this.constrainChild(cell)
          }
        })
        this.trigger(Graph.eventNames.cellsFolded, { cells, collapse, recurse })
      })
    }
  }

  /**
   * Swaps the alternate and the actual bounds in the geometry of the given
   * cell invoking <updateAlternateBounds> before carrying out the swap.
   *
   * Parameters:
   *
   * cell - <Cell> for which the bounds should be swapped.
   * willCollapse - Boolean indicating if the cell is going to be collapsed.
   */
  swapBounds(cell: Cell, willCollapse: boolean) {
    if (cell != null) {
      let geo = this.model.getGeometry(cell)
      if (geo != null) {
        geo = geo.clone()
        this.updateAlternateBounds(cell, geo, willCollapse)
        geo.swap()
        this.model.setGeometry(cell, geo)
      }
    }
  }

  /**
   * Updates or sets the alternate bounds in the given geometry for the given
   * cell depending on whether the cell is going to be collapsed. If no
   * alternate bounds are defined in the geometry and
   * <collapseToPreferredSize> is true, then the preferred size is used for
   * the alternate bounds. The top, left corner is always kept at the same
   * location.
   *
   * Parameters:
   *
   * cell - <Cell> for which the geometry is being udpated.
   * g - <mxGeometry> for which the alternate bounds should be updated.
   * willCollapse - Boolean indicating if the cell is going to be collapsed.
   */
  updateAlternateBounds(cell: Cell, geo: Geometry, willCollapse: boolean) {
    if (cell != null && geo != null) {
      const state = this.view.getState(cell)
      const style = (state != null) ? state.style : this.getCellStyle(cell)

      if (geo.alternateBounds == null) {
        let bounds = geo.bounds

        if (this.collapseToPreferredSize) {
          const tmp = this.getPreferredSizeForCell(cell)

          if (tmp != null) {
            bounds = tmp

            const startSize = util.getValue(style, constants.STYLE_STARTSIZE)

            if (startSize > 0) {
              bounds.height = Math.max(bounds.height, startSize)
            }
          }
        }

        geo.alternateBounds = new Rectangle(0, 0, bounds.width, bounds.height)
      }

      if (geo.alternateBounds != null) {
        geo.alternateBounds.x = geo.bounds.x
        geo.alternateBounds.y = geo.bounds.y

        const alpha = util.toRadians(style[constants.STYLE_ROTATION] || 0)

        if (alpha !== 0) {
          const dx = geo.alternateBounds.getCenterX() - geo.bounds.getCenterX()
          const dy = geo.alternateBounds.getCenterY() - geo.bounds.getCenterY()

          const cos = Math.cos(alpha)
          const sin = Math.sin(alpha)

          const dx2 = cos * dx - sin * dy
          const dy2 = sin * dx + cos * dy

          geo.alternateBounds.x += dx2 - dx
          geo.alternateBounds.y += dy2 - dy
        }
      }
    }
  }

  /**
   * Returns an array with the given cells and all edges that are connected
   * to a cell or one of its descendants.
   */
  private addAllEdges(cells: Cell[]) {
    const allCells = [
      ...cells,
      ...this.getAllEdges(cells),
    ]
    return util.removeDuplicates<Cell>(allCells)
  }

  /**
   * Returns all edges connected to the given cells or its descendants.
   */
  getAllEdges(cells: Cell[]) {
    const edges: Cell[] = []
    if (cells != null) {
      cells.forEach((cell) => {
        cell.eachEdge(edge => edges.push(edge))
        // 递归
        const children = this.model.getChildren(cell)
        edges.push(...this.getAllEdges(children))
      })
    }

    return edges
  }

  // #endregion

  // #region ======== Cell sizing

  /**
   * Updates the size of the given cell in the model using <cellSizeUpdated>.
   * This method fires <DomEvent.UPDATE_CELL_SIZE> while the transaction is in
   * progress. Returns the cell whose size was updated.
   *
   * Parameters:
   *
   * cell - <Cell> whose size should be updated.
   */
  updateCellSize(cell: Cell, ignoreChildren: boolean = false) {
    this.model.batchUpdate(() => {
      this.cellSizeUpdated(cell, ignoreChildren)
      this.trigger(Graph.eventNames.updateCellSize, { cell, ignoreChildren })
    })
    return cell
  }

  /**
   * Updates the size of the given cell in the model using
   * `getPreferredSizeForCell` to get the new size.
   */
  private cellSizeUpdated(cell: Cell, ignoreChildren: boolean) {
    if (cell != null) {
      this.model.batchUpdate(() => {
        const size = this.getPreferredSizeForCell(cell)
        let geo = this.model.getGeometry(cell)!

        if (size != null && geo != null) {
          const collapsed = this.isCellCollapsed(cell)
          geo = geo.clone()

          if (this.isSwimlane(cell)) {
            const state = this.view.getState(cell)
            const style = (state != null) ? state.style : this.getCellStyle(cell)
            let cellStyle = this.model.getStyle(cell)

            if (cellStyle == null) {
              cellStyle = ''
            }

            if (util.getBooleanFromStyle(style, StyleName.horizontal, true)) {
              cellStyle = util.setStyle(
                cellStyle,
                StyleName.startSize,
                `${size.height + 8}`,
              )

              if (collapsed) {
                geo.bounds.height = size.height + 8
              }

              geo.bounds.width = size.width

            } else {

              cellStyle = util.setStyle(
                cellStyle,
                StyleName.startSize,
                `${size.width + 8}`,
              )

              if (collapsed) {
                geo.bounds.width = size.width + 8
              }

              geo.bounds.height = size.height
            }

            this.model.setStyle(cell, cellStyle)

          } else {
            geo.bounds.width = size.width
            geo.bounds.height = size.height
          }

          if (!ignoreChildren && !collapsed) {
            const bounds = this.view.getBounds(this.model.getChildren(cell))
            if (bounds != null) {
              const tr = this.view.translate
              const scale = this.view.scale

              const width = (bounds.x + bounds.width) / scale - geo.bounds.x - tr.x
              const height = (bounds.y + bounds.height) / scale - geo.bounds.y - tr.y

              geo.bounds.width = Math.max(geo.bounds.width, width)
              geo.bounds.height = Math.max(geo.bounds.height, height)
            }
          }

          this.cellsResized([cell], [geo.bounds], false)
        }
      })
    }
  }

  /**
   * Returns the preferred width and height of the given <Cell> as an
   * <Rect>. To implement a minimum width, add a new style eg.
   * minWidth in the vertex and override this method as follows.
   *
   * (code)
   * var graphGetPreferredSizeForCell = graph.getPreferredSizeForCell;
   * graph.getPreferredSizeForCell (cell)
   * {
   *   var result = graphGetPreferredSizeForCell.apply(this, arguments);
   *   var style = this.getCellStyle(cell);
   *
   *   if (style['minWidth'] > 0)
   *   {
   *     result.width = Math.max(style['minWidth'], result.width);
   *   }
   *
   *   return result;
   * };
   * (end)
   *
   * Parameters:
   *
   * cell - <Cell> for which the preferred size should be returned.
   */
  private getPreferredSizeForCell(cell: Cell) {
    let result = null

    if (cell != null) {
      const state = this.view.getState(cell) || this.view.createState(cell)
      const style = state.style

      if (!this.model.isEdge(cell)) {
        const fontSize = style[constants.STYLE_FONTSIZE] || constants.DEFAULT_FONTSIZE
        let dx = 0
        let dy = 0

        // Adds dimension of image if shape is a label
        if (this.getImage(state) != null || style[constants.STYLE_IMAGE] != null) {
          if (style[constants.STYLE_SHAPE] === constants.SHAPE_LABEL) {
            if (style[constants.STYLE_VERTICAL_ALIGN] === constants.ALIGN_MIDDLE) {
              dx += parseFloat(style[constants.STYLE_IMAGE_WIDTH]) || Label.prototype.imageSize
            }

            if (style[constants.STYLE_ALIGN] !== constants.ALIGN_CENTER) {
              dy += parseFloat(style[constants.STYLE_IMAGE_HEIGHT]) || Label.prototype.imageSize
            }
          }
        }

        // Adds spacings
        dx += 2 * (style[constants.STYLE_SPACING] || 0)
        dx += style[constants.STYLE_SPACING_LEFT] || 0
        dx += style[constants.STYLE_SPACING_RIGHT] || 0

        dy += 2 * (style[constants.STYLE_SPACING] || 0)
        dy += style[constants.STYLE_SPACING_TOP] || 0
        dy += style[constants.STYLE_SPACING_BOTTOM] || 0

        // Add spacing for collapse/expand icon
        // LATER: Check alignment and use constants
        // for image spacing
        const image = this.getFoldingImage(state)

        if (image != null) {
          dx += image.width + 8
        }

        // Adds space for label
        let value = this.renderer.getLabelValue(state)

        if (value != null && value.length > 0) {
          if (!this.isHtmlLabel(state.cell)) {
            value = util.escape(value)
          }

          value = value.replace(/\n/g, '<br>')

          const size = util.getSizeForString(value, fontSize, style[constants.STYLE_FONTFAMILY])
          let width = size.width + dx
          let height = size.height + dy

          if (!util.getValue(style, constants.STYLE_HORIZONTAL, true)) {
            const tmp = height

            height = width
            width = tmp
          }

          if (this.gridEnabled) {
            width = this.snap(width + this.gridSize / 2)
            height = this.snap(height + this.gridSize / 2)
          }

          result = new Rectangle(0, 0, width, height)
        } else {
          const gs2 = 4 * this.gridSize
          result = new Rectangle(0, 0, gs2, gs2)
        }
      }
    }

    return result
  }

  /**
   * Sets the bounds of the given cell using <resizeCells>. Returns the
   * cell which was passed to the function.
   *
   * Parameters:
   *
   * cell - <Cell> whose bounds should be changed.
   * bounds - <Rect> that represents the new bounds.
   */
  resizeCell(cell: Cell, bounds: Rectangle, recurse?: boolean) {
    return this.resizeCells([cell], [bounds], recurse)[0]
  }

  /**
   * Function: resizeCells
   *
   * Sets the bounds of the given cells and fires a <DomEvent.RESIZE_CELLS>
   * event while the transaction is in progress. Returns the cells which
   * have been passed to the function.
   *
   * Parameters:
   *
   * cells - Array of <Cells> whose bounds should be changed.
   * bounds - Array of <Rects> that represent the new bounds.
   */
  resizeCells(
    cells: Cell[],
    bounds: Rectangle[],
    recurse: boolean = this.isRecursiveResize(),
  ) {
    this.model.batchUpdate(() => {
      this.cellsResized(cells, bounds, recurse)
      this.trigger(Graph.eventNames.resizeCells, { cells, bounds })
    })
    return cells
  }

  /**
   * Sets the bounds of the given cells and fires a <DomEvent.CELLS_RESIZED>
   * event. If <extendParents> is true, then the parent is extended if a
   * child size is changed so that it overlaps with the parent.
   *
   * The following example shows how to control group resizes to make sure
   * that all child cells stay within the group.
   *
   * (code)
   * graph.addListener(DomEvent.CELLS_RESIZED, function(sender, evt)
   * {
   *   var cells = evt.getProperty('cells');
   *
   *   if (cells != null)
   *   {
   *     for (var i = 0; i < cells.length; i++)
   *     {
   *       if (graph.getModel().getChildCount(cells[i]) > 0)
   *       {
   *         var geo = graph.getCellGeometry(cells[i]);
   *
   *         if (geo != null)
   *         {
   *           var children = graph.getChildCells(cells[i], true, true);
   *           var bounds = graph.getBoundingBoxFromGeometry(children, true);
   *
   *           geo = geo.clone();
   *           geo.width = Math.max(geo.width, bounds.width);
   *           geo.height = Math.max(geo.height, bounds.height);
   *
   *           graph.getModel().setGeometry(cells[i], geo);
   *         }
   *       }
   *     }
   *   }
   * });
   * (end)
   *
   * Parameters:
   *
   * cells - Array of <Cells> whose bounds should be changed.
   * bounds - Array of <Rects> that represent the new bounds.
   * recurse - Optional boolean that specifies if the children should be resized.
   */
  cellsResized(
    cells: Cell[],
    bounds: Rectangle[],
    recurse: boolean = false,
  ) {
    if (cells != null && bounds != null && cells.length === bounds.length) {
      this.model.batchUpdate(() => {
        for (let i = 0, ii = cells.length; i < ii; i += 1) {
          this.cellResized(cells[i], bounds[i], false, recurse)
          if (this.isExtendParent(cells[i])) {
            this.extendParent(cells[i])
          }
          this.constrainChild(cells[i])
        }

        if (this.resetEdgesOnResize) {
          this.resetEdges(cells)
        }

        this.trigger(Graph.eventNames.cellsResized, { cells, bounds })
      })
    }
  }

  /**
   * Resizes the parents recursively so that they contain the complete area
   * of the resized child cell.
   *
   * Parameters:
   *
   * cell - <Cell> whose bounds should be changed.
   * bounds - <Rects> that represent the new bounds.
   * ignoreRelative - Boolean that indicates if relative cells should be ignored.
   * recurse - Optional boolean that specifies if the children should be resized.
   */
  cellResized(
    cell: Cell,
    bounds: Rectangle,
    ignoreRelative: boolean,
    recurse: boolean,
  ) {
    let geo = this.model.getGeometry(cell)
    if (
      geo != null &&
      (
        geo.bounds.x !== bounds.x ||
        geo.bounds.y !== bounds.y ||
        geo.bounds.width !== bounds.width ||
        geo.bounds.height !== bounds.height
      )
    ) {
      geo = geo.clone()

      if (!ignoreRelative && geo.relative) {
        const offset = geo.offset

        if (offset != null) {
          offset.x += bounds.x - geo.bounds.x
          offset.y += bounds.y - geo.bounds.y
        }
      } else {
        geo.bounds.x = bounds.x
        geo.bounds.y = bounds.y
      }

      geo.bounds.width = bounds.width
      geo.bounds.height = bounds.height

      if (
        !geo.relative && this.model.isNode(cell) &&
        !this.isAllowNegativeCoordinates()
      ) {
        geo.bounds.x = Math.max(0, geo.bounds.x)
        geo.bounds.y = Math.max(0, geo.bounds.y)
      }

      this.model.batchUpdate(() => {
        if (recurse) {
          this.resizeChildCells(cell, geo!)
        }

        this.model.setGeometry(cell, geo!)
        this.constrainChildCells(cell)
      })
    }
  }

  /**
   * Resizes the child cells of the given cell for the given new geometry with
   * respect to the current geometry of the cell.
   *
   * Parameters:
   *
   * cell - <Cell> that has been resized.
   * newGeo - <mxGeometry> that represents the new bounds.
   */
  resizeChildCells(cell: Cell, newGeo: Geometry) {
    const geo = this.model.getGeometry(cell)!
    const dx = newGeo.bounds.width / geo.bounds.width
    const dy = newGeo.bounds.height / geo.bounds.height
    cell.eachChild(child => this.scaleCell(child, dx, dy, true))
  }

  /**
   * Constrains the children of the given cell using <constrainChild>.
   */
  constrainChildCells(cell: Cell) {
    cell.eachChild(child => this.constrainChild(child))
  }

  /**
   * Scales the points, position and size of the given cell according to the
   * given vertical and horizontal scaling factors.
   *
   * Parameters:
   *
   * cell - <Cell> whose geometry should be scaled.
   * dx - Horizontal scaling factor.
   * dy - Vertical scaling factor.
   * recurse - Boolean indicating if the child cells should be scaled.
   */
  scaleCell(cell: Cell, dx: number, dy: number, recurse: boolean) {
    let geo = this.model.getGeometry(cell)

    if (geo != null) {
      const state = this.view.getState(cell)
      const style = (state != null) ? state.style : this.getCellStyle(cell)

      geo = geo.clone()

      // Stores values for restoring based on style
      const x = geo.bounds.x
      const y = geo.bounds.y
      const w = geo.bounds.width
      const h = geo.bounds.height

      geo.scale(dx, dy, style[constants.STYLE_ASPECT] === 'fixed')

      if (style[constants.STYLE_RESIZE_WIDTH] === '1') {
        geo.bounds.width = w * dx
      } else if (style[constants.STYLE_RESIZE_WIDTH] === '0') {
        geo.bounds.width = w
      }

      if (style[constants.STYLE_RESIZE_HEIGHT] === '1') {
        geo.bounds.height = h * dy
      } else if (style[constants.STYLE_RESIZE_HEIGHT] === '0') {
        geo.bounds.height = h
      }

      if (!this.isCellMovable(cell)) {
        geo.bounds.x = x
        geo.bounds.y = y
      }

      if (!this.isCellResizable(cell)) {
        geo.bounds.width = w
        geo.bounds.height = h
      }

      if (this.model.isNode(cell)) {
        this.cellResized(cell, geo.bounds, true, recurse)
      } else {
        this.model.setGeometry(cell, geo)
      }
    }
  }

  /**
   * Resizes the parents recursively so that they contain the complete area
   * of the resized child cell.
   *
   * Parameters:
   *
   * cell - <Cell> that has been resized.
   */
  extendParent(cell: Cell) {
    if (cell != null) {
      const parent = this.model.getParent(cell)
      let pgeo = this.getCellGeometry(parent!)

      if (parent != null && pgeo != null && !this.isCellCollapsed(parent)) {
        const geo = this.getCellGeometry(cell)

        if (
          geo != null &&
          !geo.relative &&
          (
            pgeo.bounds.width < geo.bounds.x + geo.bounds.width ||
            pgeo.bounds.height < geo.bounds.y + geo.bounds.height
          )
        ) {
          pgeo = pgeo.clone()
          pgeo.bounds.width = Math.max(pgeo.bounds.width, geo.bounds.x + geo.bounds.width)
          pgeo.bounds.height = Math.max(pgeo.bounds.height, geo.bounds.y + geo.bounds.height)

          this.cellsResized([parent], [pgeo.bounds], false)
        }
      }
    }
  }

  // #endregion

  // #region ======== Cell moving

  /**
   * Clones and inserts the given cells into the graph using the move
   * method and returns the inserted cells. This shortcut is used if
   * cells are inserted via datatransfer.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be imported.
   * dx - Integer that specifies the x-coordinate of the vector. Default is 0.
   * dy - Integer that specifies the y-coordinate of the vector. Default is 0.
   * target - <Cell> that represents the new parent of the cells.
   * evt - Mouseevent that triggered the invocation.
   * mapping - Optional mapping for existing clones.
   */
  importCells(
    cells: Cell[],
    dx: number,
    dy: number,
    target?: Cell,
    e?: MouseEvent,
    mapping?: WeakMap<Cell, Cell>,
  ) {
    return this.moveCells(cells, dx, dy, true, target, e, mapping)
  }

  /**
   * Moves or clones the specified cells and moves the cells or clones by the
   * given amount, adding them to the optional target cell. The evt is the
   * mouse event as the mouse was released. The change is carried out using
   * <cellsMoved>. This method fires <DomEvent.MOVE_CELLS> while the
   * transaction is in progress. Returns the cells that were moved.
   *
   * Use the following code to move all cells in the graph.
   *
   * (code)
   * graph.moveCells(graph.getChildCells(null, true, true), 10, 10);
   * (end)
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be moved, cloned or added to the target.
   * dx - Integer that specifies the x-coordinate of the vector. Default is 0.
   * dy - Integer that specifies the y-coordinate of the vector. Default is 0.
   * clone - Boolean indicating if the cells should be cloned. Default is false.
   * target - <Cell> that represents the new parent of the cells.
   * evt - Mouseevent that triggered the invocation.
   * mapping - Optional mapping for existing clones.
   */
  moveCells(
    cells: Cell[],
    dx: number = 0,
    dy: number = 0,
    clone: boolean = false,
    target?: Cell,
    evt?: MouseEvent,
    mapping?: WeakMap<Cell, Cell>,
  ) {

    if (cells != null && (dx !== 0 || dy !== 0 || clone || target != null)) {
      // Removes descendants with ancestors in cells to avoid multiple moving
      // tslint:disable-next-line
      cells = this.model.getTopmostCells(cells)

      this.model.beginUpdate()
      try {
        // Faster cell lookups to remove relative edge labels with selected
        // terminals to avoid explicit and implicit move at same time
        const dict = new WeakMap<Cell, boolean>()

        for (let i = 0; i < cells.length; i += 1) {
          dict.set(cells[i], true)
        }

        const isSelected = (cell: Cell | null) => {
          let node = cell
          while (node != null) {
            if (dict.get(node)) {
              return true
            }

            node = this.model.getParent(node)!
          }

          return false
        }

        // Removes relative edge labels with selected terminals
        const checked = []

        for (let i = 0; i < cells.length; i += 1) {
          const geo = this.getCellGeometry(cells[i])
          const parent = this.model.getParent(cells[i])!

          if (
            (geo == null || !geo.relative) ||
            !this.model.isEdge(parent) ||
            (
              !isSelected(this.model.getTerminal(parent, true)) &&
              !isSelected(this.model.getTerminal(parent, false))
            )
          ) {
            checked.push(cells[i])
          }
        }

        // tslint:disable-next-line
        cells = checked

        if (clone) {
          // tslint:disable-next-line
          cells = this.cloneCells(cells, this.isCloneInvalidEdges(), mapping)!

          if (target == null) {
            // tslint:disable-next-line
            target = this.getDefaultParent()!
          }
        }

        // FIXME: Cells should always be inserted first before any other edit
        // to avoid forward references in sessions.
        // Need to disable allowNegativeCoordinates if target not null to
        // allow for temporary negative numbers until cellsAdded is called.
        const previous = this.isAllowNegativeCoordinates()

        if (target != null) {
          this.setAllowNegativeCoordinates(true)
        }

        this.cellsMoved(
          cells, dx, dy,
          !clone && this.isDisconnectOnMove() && this.isAllowDanglingEdges(),
          target == null,
          this.isExtendParentsOnMove() && target == null,
        )

        this.setAllowNegativeCoordinates(previous)

        if (target != null) {
          const index = this.model.getChildCount(target)
          this.cellsAdded(cells, target, index, null, null, true)
        }

        // Dispatches a move event
        // this.fireEvent(new DomEventObject(DomEvent.MOVE_CELLS, 'cells', cells,
        //   'dx', dx, 'dy', dy, 'clone', clone, 'target', target, 'event', evt))
      } finally {
        this.model.endUpdate()
      }
    }

    return cells
  }

  /**
   * Function: cellsMoved
   *
   * Moves the specified cells by the given vector, disconnecting the cells
   * using disconnectGraph is disconnect is true. This method fires
   * <DomEvent.CELLS_MOVED> while the transaction is in progress.
   */
  cellsMoved(
    cells: Cell[],
    dx: number,
    dy: number,
    disconnect: boolean,
    constrain: boolean,
    extend: boolean = false,
  ) {
    if (cells != null && (dx !== 0 || dy !== 0)) {
      this.model.beginUpdate()
      try {
        if (disconnect) {
          this.disconnectGraph(cells)
        }

        for (let i = 0; i < cells.length; i += 1) {
          this.translateCell(cells[i], dx, dy)

          if (extend && this.isExtendParent(cells[i])) {
            this.extendParent(cells[i])
          } else if (constrain) {
            this.constrainChild(cells[i])
          }
        }

        if (this.resetEdgesOnMove) {
          this.resetEdges(cells)
        }

        // this.fireEvent(new DomEventObject(DomEvent.CELLS_MOVED,
        //   'cells', cells, 'dx', dx, 'dy', dy, 'disconnect', disconnect))
      } finally {
        this.model.endUpdate()
      }
    }
  }

  /**
   * Function: translateCell
   *
   * Translates the geometry of the given cell and stores the new,
   * translated geometry in the model as an atomic change.
   */
  translateCell(cell: Cell, dx: number, dy: number) {
    let geo = this.model.getGeometry(cell)
    if (geo != null) {
      geo = geo.clone()
      geo.translate(+dx, +dy)

      if (!geo.relative && this.model.isNode(cell) && !this.isAllowNegativeCoordinates()) {
        geo.bounds.x = Math.max(0, geo.bounds.x)
        geo.bounds.y = Math.max(0, geo.bounds.y)
      }

      if (geo.relative && !this.model.isEdge(cell)) {
        const parent = this.model.getParent(cell)!
        let angle = 0

        if (this.model.isNode(parent)) {
          const state = this.view.getState(parent)
          const style = (state != null) ? state.style : this.getCellStyle(parent)

          angle = util.getValue(style, constants.STYLE_ROTATION, 0)
        }

        if (angle !== 0) {
          const rad = util.toRadians(-angle)
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)
          const pt = util.rotatePoint(new Point(dx, dy), cos, sin, new Point(0, 0))
          dx = pt.x // tslint:disable-line
          dy = pt.y // tslint:disable-line
        }

        if (geo.offset == null) {
          geo.offset = new Point(dx, dy)
        } else {
          geo.offset.x = geo.offset.x + dx
          geo.offset.y = geo.offset.y + dy
        }
      }

      this.model.setGeometry(cell, geo)
    }
  }

  /**
   * Function: getCellContainmentArea
   *
   * Returns the <Rect> inside which a cell is to be kept.
   *
   * Parameters:
   *
   * cell - <Cell> for which the area should be returned.
   */
  getCellContainmentArea(cell: Cell) {
    if (cell != null && !this.model.isEdge(cell)) {
      const parent = this.model.getParent(cell)

      if (parent != null && parent !== this.getDefaultParent()) {
        const g = this.model.getGeometry(parent)

        if (g != null) {
          let x = 0
          let y = 0
          let w = g.bounds.width
          let h = g.bounds.height

          if (this.isSwimlane(parent)) {
            const size = this.getStartSize(parent)

            const state = this.view.getState(parent)
            const style = (state != null) ? state.style : this.getCellStyle(parent)
            const dir = util.getValue(style, constants.STYLE_DIRECTION, constants.DIRECTION_EAST)
            const flipH = util.isFlipH(style)
            const flipV = util.isFlipV(style)

            if (
              dir === constants.DIRECTION_SOUTH ||
              dir === constants.DIRECTION_NORTH
            ) {
              const tmp = size.width
              size.width = size.height
              size.height = tmp
            }

            if (
              (dir === constants.DIRECTION_EAST && !flipV) ||
              (dir === constants.DIRECTION_NORTH && !flipH) ||
              (dir === constants.DIRECTION_WEST && flipV) ||
              (dir === constants.DIRECTION_SOUTH && flipH)
            ) {
              x = size.width
              y = size.height
            }

            w -= size.width
            h -= size.height
          }

          return new Rectangle(x, y, w, h)
        }
      }
    }

    return null
  }

  /**
   * Function: getMaximumGraphBounds
   *
   * Returns the bounds inside which the diagram should be kept as an
   * <Rect>.
   */
  getMaximumGraphBounds() {
    return this.maximumGraphBounds
  }

  /**
   * Function: constrainChild
   *
   * Keeps the given cell inside the bounds returned by
   * <getCellContainmentArea> for its parent, according to the rules defined by
   * <getOverlap> and <isConstrainChild>. This modifies the cell's geometry
   * in-place and does not clone it.
   *
   * Parameters:
   *
   * cells - <Cell> which should be constrained.
   * sizeFirst - Specifies if the size should be changed first. Default is true.
   */
  constrainChild(cell: Cell, sizeFirst: boolean = true) {
    if (cell != null) {
      let geo = this.getCellGeometry(cell)

      if (geo != null && (this.isConstrainRelativeChildren() || !geo.relative)) {
        const parent = this.model.getParent(cell)!
        // const pgeo = this.getCellGeometry(parent)
        let max = this.getMaximumGraphBounds()

        // Finds parent offset
        if (max != null) {
          const off = this.getBoundingBoxFromGeometry([parent], false)

          if (off != null) {
            max = Rectangle.clone(max)

            max.x -= off.x
            max.y -= off.y
          }
        }

        if (this.isConstrainChild(cell)) {
          let tmp = this.getCellContainmentArea(cell)

          if (tmp != null) {
            const overlap = this.getOverlap(cell)

            if (overlap > 0) {
              tmp = Rectangle.clone(tmp)

              tmp.x -= tmp.width * overlap
              tmp.y -= tmp.height * overlap
              tmp.width += 2 * tmp.width * overlap
              tmp.height += 2 * tmp.height * overlap
            }

            // Find the intersection between max and tmp
            if (max == null) {
              max = tmp
            } else {
              max = Rectangle.clone(max)
              max.intersect(tmp)
            }
          }
        }

        if (max != null) {
          const cells = [cell]

          if (!this.isCellCollapsed(cell)) {
            const desc = this.model.getDescendants(cell)

            for (let i = 0; i < desc.length; i += 1) {
              if (this.isCellVisible(desc[i])) {
                cells.push(desc[i])
              }
            }
          }

          const bbox = this.getBoundingBoxFromGeometry(cells, false)

          if (bbox != null) {
            geo = geo.clone()

            // Cumulative horizontal movement
            let dx = 0

            if (geo.bounds.width > max.width) {
              dx = geo.bounds.width - max.width
              geo.bounds.width -= dx
            }

            if (bbox.x + bbox.width > max.x + max.width) {
              dx -= bbox.x + bbox.width - max.x - max.width - dx
            }

            // Cumulative vertical movement
            let dy = 0

            if (geo.bounds.height > max.height) {
              dy = geo.bounds.height - max.height
              geo.bounds.height -= dy
            }

            if (bbox.y + bbox.height > max.y + max.height) {
              dy -= bbox.y + bbox.height - max.y - max.height - dy
            }

            if (bbox.x < max.x) {
              dx -= bbox.x - max.x
            }

            if (bbox.y < max.y) {
              dy -= bbox.y - max.y
            }

            if (dx !== 0 || dy !== 0) {
              if (geo.relative) {
                // Relative geometries are moved via absolute offset
                if (geo.offset == null) {
                  geo.offset = new Point()
                }

                geo.offset.x += dx
                geo.offset.y += dy
              } else {
                geo.bounds.x += dx
                geo.bounds.y += dy
              }
            }

            this.model.setGeometry(cell, geo)
          }
        }
      }
    }
  }

  /**
   * Resets the control points of the edges that are connected to the given
   * cells if not both ends of the edge are in the given cells array.
   *
   * Parameters:
   *
   * cells - Array of <Cells> for which the connected edges should be
   * reset.
   */
  resetEdges(cells: Cell[]) {
    if (cells != null) {
      // Prepares faster cells lookup
      const dict = new WeakMap<Cell, boolean>()

      for (let i = 0; i < cells.length; i += 1) {
        dict.set(cells[i], true)
      }

      this.model.beginUpdate()
      try {
        for (let i = 0; i < cells.length; i += 1) {
          const edges = this.model.getEdges(cells[i])

          if (edges != null) {
            for (let j = 0; j < edges.length; j += 1) {
              const state = this.view.getState(edges[j])

              const source = (state != null)
                ? state.getVisibleTerminal(true)
                : this.view.getVisibleTerminal(edges[j], true)

              const target = (state != null)
                ? state.getVisibleTerminal(false)
                : this.view.getVisibleTerminal(edges[j], false)

              // Checks if one of the terminals is not in the given array
              if (!dict.get(source!) || !dict.get(target!)) {
                this.resetEdge(edges[j])
              }
            }
          }

          this.resetEdges(this.model.getChildren(cells[i]))
        }
      } finally {
        this.model.endUpdate()
      }
    }
  }

  /**
   * Function: resetEdge
   *
   * Resets the control points of the given edge.
   *
   * Parameters:
   *
   * edge - <Cell> whose points should be reset.
   */
  resetEdge(edge: Cell) {
    let geo = this.model.getGeometry(edge)
    if (geo != null && geo.points != null && geo.points.length > 0) {
      geo = geo.clone()
      geo.points = []
      this.model.setGeometry(edge, geo)
    }

    return edge
  }

  // #endregion

  // #region ======== Cell connecting and connection constraints

  /**
   * Returns the constraint used to connect to the outline of the given state.
   */
  getOutlineConstraint(point: Point, terminalState: CellState, me: any) {
    if (terminalState.shape != null) {
      const bounds = this.view.getPerimeterBounds(terminalState)
      const direction = terminalState.style[constants.STYLE_DIRECTION]

      if (
        direction === constants.DIRECTION_NORTH ||
        direction === constants.DIRECTION_SOUTH
      ) {
        bounds.x += bounds.width / 2 - bounds.height / 2
        bounds.y += bounds.height / 2 - bounds.width / 2
        const tmp = bounds.width
        bounds.width = bounds.height
        bounds.height = tmp
      }

      const alpha = util.toRadians(terminalState.shape.getShapeRotation())

      if (alpha !== 0) {
        const cos = Math.cos(-alpha)
        const sin = Math.sin(-alpha)

        const ct = new Point(bounds.getCenterX(), bounds.getCenterY())
        // tslint:disable-next-line
        point = util.rotatePoint(point, cos, sin, ct)
      }

      let sx = 1
      let sy = 1
      let dx = 0
      let dy = 0

      // LATER: Add flipping support for image shapes
      if (this.getModel().isNode(terminalState.cell)) {
        let flipH = terminalState.style[constants.STYLE_FLIPH]
        let flipV = terminalState.style[constants.STYLE_FLIPV]

        if (
          direction === constants.DIRECTION_NORTH ||
          direction === constants.DIRECTION_SOUTH
        ) {
          const tmp = flipH
          flipH = flipV
          flipV = tmp
        }

        if (flipH) {
          sx = -1
          dx = -bounds.width
        }

        if (flipV) {
          sy = -1
          dy = -bounds.height
        }
      }

      // tslint:disable-next-line
      point = new Point(
        (point.x - bounds.x) * sx - dx + bounds.x,
        (point.y - bounds.y) * sy - dy + bounds.y,
      )

      const x = (bounds.width === 0)
        ? 0
        : Math.round((point.x - bounds.x) * 1000 / bounds.width) / 1000

      const y = (bounds.height === 0)
        ? 0
        : Math.round((point.y - bounds.y) * 1000 / bounds.height) / 1000

      return new ConnectionConstraint(new Point(x, y), false)
    }

    return null
  }

  /**
   * Returns an array of all <mxConnectionConstraints> for the given terminal. If
   * the shape of the given terminal is a <mxStencilShape> then the constraints
   * of the corresponding <mxStencil> are returned.
   *
   * Parameters:
   *
   * terminal - <CellState> that represents the terminal.
   * source - Boolean that specifies if the terminal is the source or target.
   */
  getAllConnectionConstraints(terminalState: CellState, isSource: boolean) {
    if (
      terminalState != null &&
      terminalState.shape != null &&
      terminalState.shape.stencil != null
    ) {
      return terminalState.shape.stencil.constraints
    }

    return null
  }

  /**
   * Returns an `ConnectionConstraint` that describes the given connection
   * point.
   */
  getConnectionConstraint(
    edgeState: CellState,
    terminalState?: CellState | null,
    isSource: boolean = false,
  ) {

    let point: Point | null = null

    // connection point specified in style
    const x = edgeState.style[isSource ? StyleName.exitX : StyleName.entryX]
    if (x != null) {
      const y = edgeState.style[isSource ? StyleName.exitY : StyleName.entryY]
      if (y != null) {
        point = new Point(parseFloat(x), parseFloat(y))
      }
    }

    let perimeter = false
    let dx = 0
    let dy = 0

    if (point != null) {
      perimeter = util.getBooleanFromStyle(
        edgeState.style,
        isSource ? StyleName.exitPerimeter : StyleName.entryPerimeter,
        true,
      )

      // Add entry/exit offset
      dx = parseFloat(edgeState.style[isSource ? StyleName.exitDx : StyleName.entryDx])
      dy = parseFloat(edgeState.style[isSource ? StyleName.exitDy : StyleName.entryDy])

      dx = isFinite(dx) ? dx : 0
      dy = isFinite(dy) ? dy : 0
    }

    return new ConnectionConstraint(point, perimeter, null, dx, dy)
  }

  /**
   * Sets the <mxConnectionConstraint> that describes the given connection point.
   * If no constraint is given then nothing is changed. To remove an existing
   * constraint from the given edge, use an empty constraint instead.
   *
   * Parameters:
   *
   * edge - <Cell> that represents the edge.
   * terminal - <Cell> that represents the terminal.
   * source - Boolean indicating if the terminal is the source or target.
   * constraint - Optional <mxConnectionConstraint> to be used for this
   * connection.
   */
  setConnectionConstraint(
    edge: Cell,
    terminal: Cell,
    isSource: boolean,
    constraint?: ConnectionConstraint | null,
  ) {
    if (constraint != null) {
      this.model.beginUpdate()

      try {
        if (constraint == null || constraint.point == null) {
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_X : constants.STYLE_ENTRY_X,
            null,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_Y : constants.STYLE_ENTRY_Y,
            null,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_DX : constants.STYLE_ENTRY_DX,
            null,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_DY : constants.STYLE_ENTRY_DY,
            null,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_PERIMETER : constants.STYLE_ENTRY_PERIMETER,
            null,
            [edge],
          )
        } else if (constraint.point != null) {
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_X : constants.STYLE_ENTRY_X,
            `${constraint.point.x}`,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_Y : constants.STYLE_ENTRY_Y,
            `${constraint.point.y}`,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_DX : constants.STYLE_ENTRY_DX,
            `${constraint.dx}`,
            [edge],
          )
          this.setCellStyles(
            (isSource) ? constants.STYLE_EXIT_DY : constants.STYLE_ENTRY_DY,
            `${constraint.dy}`,
            [edge],
          )

          // Only writes 0 since 1 is default
          if (!constraint.perimeter) {
            this.setCellStyles(
              (isSource)
                ? constants.STYLE_EXIT_PERIMETER
                : constants.STYLE_ENTRY_PERIMETER,
              '0',
              [edge],
            )
          } else {
            this.setCellStyles(
              (isSource)
                ? constants.STYLE_EXIT_PERIMETER
                : constants.STYLE_ENTRY_PERIMETER,
              null,
              [edge],
            )
          }
        }
      } finally {
        this.model.endUpdate()
      }
    }
  }

  /**
   * Returns the nearest point in the list of absolute points
   * or the center of the opposite terminal.
   *
   * Parameters:
   *
   * vertex - <CellState> that represents the vertex.
   * constraint - <mxConnectionConstraint> that represents the connection point
   * constraint as returned by <getConnectionConstraint>.
   */
  getConnectionPoint(
    terminalState: CellState,
    constraint: ConnectionConstraint,
    round: boolean = true,
  ) {
    let result: Point | null = null

    if (terminalState != null && constraint.point != null) {
      const direction = terminalState.style[StyleName.direction]
      const bounds = this.view.getPerimeterBounds(terminalState)
      const cx = bounds.getCenter()

      let r1 = 0

      if (
        direction != null &&
        util.getBooleanFromStyle(terminalState.style, StyleName.anchorPointDirection, true)
      ) {
        if (direction === Direction.north) {
          r1 += 270
        } else if (direction === Direction.west) {
          r1 += 180
        } else if (direction === Direction.south) {
          r1 += 90
        }

        // Bounds need to be rotated by 90 degrees for further computation
        if (
          direction === Direction.north ||
          direction === Direction.south
        ) {
          bounds.rotate90()
        }
      }

      const scale = this.view.scale

      result = new Point(
        bounds.x + constraint.point.x * bounds.width + constraint.dx * scale,
        bounds.y + constraint.point.y * bounds.height + constraint.dy * scale,
      )

      // Rotation for direction before projection on perimeter
      let r2 = terminalState.style[StyleName.rotation] || 0

      if (constraint.perimeter) {
        if (r1 !== 0) {
          // Only 90 degrees steps possible here so no trig needed
          let cos = 0
          let sin = 0

          if (r1 === 90) {
            sin = 1
          } else if (r1 === 180) {
            cos = -1
          } else if (r1 === 270) {
            sin = -1
          }
          result = util.rotatePoint(result, cos, sin, cx)
        }

        result = this.view.getPerimeterPoint(terminalState, result, false)

      } else {
        r2 += r1

        if (this.getModel().isNode(terminalState.cell)) {

          const flipH = util.isFlipH(terminalState.style)
          const flipV = util.isFlipV(terminalState.style)

          if (flipH) {
            result.x = 2 * bounds.getCenterX() - result.x
          }

          if (flipV) {
            result.y = 2 * bounds.getCenterY() - result.y
          }
        }
      }

      // Generic rotation after projection on perimeter
      if (r2 !== 0 && result != null) {
        const rad = util.toRadians(r2)
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        result = util.rotatePoint(result, cos, sin, cx)
      }
    }

    if (round && result != null) {
      result.x = Math.round(result.x)
      result.y = Math.round(result.y)
    }

    return result
  }

  /**
   * Connects the specified end of the given edge to the given terminal
   * using <cellConnected> and fires <DomEvent.CONNECT_CELL> while the
   * transaction is in progress. Returns the updated edge.
   *
   * Parameters:
   *
   * edge - <Cell> whose terminal should be updated.
   * terminal - <Cell> that represents the new terminal to be used.
   * source - Boolean indicating if the new terminal is the source or target.
   * constraint - Optional <mxConnectionConstraint> to be used for this
   * connection.
   */
  connectCell(
    edge: Cell,
    terminal: Cell,
    isSource: boolean,
    constraint: ConnectionConstraint,
  ) {
    this.model.beginUpdate()
    try {
      // const previous = this.model.getTerminal(edge, isSource)
      this.cellConnected(edge, terminal, isSource, constraint)
      // this.fireEvent(new DomEventObject(DomEvent.CONNECT_CELL,
      //   'edge', edge, 'terminal', terminal, 'source', isSource,
      //   'previous', previous))
    } finally {
      this.model.endUpdate()
    }

    return edge
  }

  /**
   * Sets the new terminal for the given edge and resets the edge points if
   * <resetEdgesOnConnect> is true. This method fires
   * <DomEvent.CELL_CONNECTED> while the transaction is in progress.
   *
   * Parameters:
   *
   * edge - <Cell> whose terminal should be updated.
   * terminal - <Cell> that represents the new terminal to be used.
   * source - Boolean indicating if the new terminal is the source or target.
   * constraint - <mxConnectionConstraint> to be used for this connection.
   */
  cellConnected(
    edge: Cell,
    terminal: Cell,
    isSource: boolean,
    constraint?: ConnectionConstraint,
  ) {
    if (edge != null) {
      this.model.beginUpdate()
      try {
        // const previous = this.model.getTerminal(edge, isSource)

        // Updates the constraint
        this.setConnectionConstraint(edge, terminal, isSource, constraint)

        // Checks if the new terminal is a port, uses the ID of the port in the
        // style and the parent of the port as the actual terminal of the edge.
        if (this.isPortsEnabled()) {
          let id = null

          if (this.isPort(terminal)) {
            id = terminal.getId()
            // tslint:disable-next-line
            terminal = this.getTerminalForPort(terminal, isSource)!
          }

          // Sets or resets all previous information for connecting to a child port
          const key = (isSource) ? constants.STYLE_SOURCE_PORT :
            constants.STYLE_TARGET_PORT
          this.setCellStyles(key, id as string, [edge])
        }

        this.model.setTerminal(edge, terminal, isSource)

        if (this.resetEdgesOnConnect) {
          this.resetEdge(edge)
        }

        // this.fireEvent(new DomEventObject(DomEvent.CELL_CONNECTED,
        //   'edge', edge, 'terminal', terminal, 'source', isSource,
        //   'previous', previous))
      } finally {
        this.model.endUpdate()
      }
    }
  }

  /**
   * Disconnects the given edges from the terminals which are not in the
   * given array.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be disconnected.
   */
  disconnectGraph(cells: Cell[]) {
    if (cells != null) {
      this.model.beginUpdate()
      try {
        const scale = this.view.scale
        const tr = this.view.translate

        // Fast lookup for finding cells in array
        const dict = new WeakMap<Cell, boolean>()

        for (let i = 0; i < cells.length; i += 1) {
          dict.set(cells[i], true)
        }

        for (let i = 0; i < cells.length; i += 1) {
          if (this.model.isEdge(cells[i])) {
            let geo = this.model.getGeometry(cells[i])

            if (geo != null) {
              const state = this.view.getState(cells[i])
              const pstate = this.view.getState(
                this.model.getParent(cells[i]))

              if (state != null &&
                pstate != null) {
                geo = geo.clone()

                const dx = -pstate.origin.x
                const dy = -pstate.origin.y
                const pts = state.absolutePoints

                let src = this.model.getTerminal(cells[i], true)

                if (src != null && this.isCellDisconnectable(cells[i], src, true)) {
                  while (src != null && !dict.get(src)) {
                    src = this.model.getParent(src)
                  }

                  if (src == null) {
                    geo.setTerminalPoint(
                      new Point(
                        pts[0]!.x / scale - tr.x + dx,
                        pts[0]!.y / scale - tr.y + dy,
                      ),
                      true,
                    )
                    this.model.setTerminal(cells[i], null, true)
                  }
                }

                let trg = this.model.getTerminal(cells[i], false)

                if (trg != null && this.isCellDisconnectable(cells[i], trg, false)) {
                  while (trg != null && !dict.get(trg)) {
                    trg = this.model.getParent(trg)
                  }

                  if (trg == null) {
                    const n = pts.length - 1
                    geo.setTerminalPoint(
                      new Point(
                        pts[n]!.x / scale - tr.x + dx,
                        pts[n]!.y / scale - tr.y + dy,
                      ),
                      false,
                    )
                    this.model.setTerminal(cells[i], null, false)
                  }
                }

                this.model.setGeometry(cells[i], geo)
              }
            }
          }
        }
      } finally {
        this.model.endUpdate()
      }
    }
  }

  // #endregion

  // #region ======== Drilldown

  /**
   * Returns the current root of the displayed cell hierarchy.
   */
  getCurrentRoot() {
    return this.view.currentRoot
  }

  /**
   * Returns the translation to be used if the given cell is the root cell as
   * an <Point>. This implementation returns null.
   *
   * Example:
   *
   * To keep the children at their absolute position while stepping into groups,
   * this function can be overridden as follows.
   *
   * (code)
   * var offset = new Point(0, 0);
   *
   * while (cell != null)
   * {
   *   var geo = this.model.getGeometry(cell);
   *
   *   if (geo != null)
   *   {
   *     offset.x -= geo.x;
   *     offset.y -= geo.y;
   *   }
   *
   *   cell = this.model.getParent(cell);
   * }
   *
   * return offset;
   * (end)
   *
   * Parameters:
   *
   * cell - <Cell> that represents the root.
   */
  getTranslateForRoot(cell: Cell | null): Point | null {
    return null
  }

  /**
   * Returns true if the given cell is a "port", that is, when connecting to
   * it, the cell returned by getTerminalForPort should be used as the
   * terminal and the port should be referenced by the ID in either the
   * constants.STYLE_SOURCE_PORT or the or the
   * constants.STYLE_TARGET_PORT. Note that a port should not be movable.
   * This implementation always returns false.
   *
   * A typical implementation is the following:
   *
   * (code)
   * graph.isPort (cell)
   * {
   *   var geo = this.getCellGeometry(cell);
   *
   *   return (geo != null) ? geo.relative : false;
   * };
   * (end)
   *
   * Parameters:
   *
   * cell - <Cell> that represents the port.
   */
  isPort(cell: Cell) {
    return false
  }

  /**
   * Returns the terminal to be used for a given port. This implementation
   * always returns the parent cell.
   *
   * Parameters:
   *
   * cell - <Cell> that represents the port.
   * source - If the cell is the source or target port.
   */
  getTerminalForPort(cell: Cell, isSource: boolean) {
    return this.model.getParent(cell)
  }

  /**
   * Returns the offset to be used for the cells inside the given cell. The
   * root and layer cells may be identified using <mxGraphModel.isRoot> and
   * <mxGraphModel.isLayer>. For all other current roots, the
   * <mxGraphView.currentRoot> field points to the respective cell, so that
   * the following holds: cell == this.view.currentRoot. This implementation
   * returns null.
   *
   * Parameters:
   *
   * cell - <Cell> whose offset should be returned.
   */
  getChildOffsetForCell(cell: Cell): Point | null {
    return null
  }

  /**
   * Uses the given cell as the root of the displayed cell hierarchy. If no
   * cell is specified then the selection cell is used. The cell is only used
   * if <isValidRoot> returns true.
   *
   * Parameters:
   *
   * cell - Optional <Cell> to be used as the new root. Default is the
   * selection cell.
   */
  enterGroup(cell: Cell = this.getSelectionCell()) {
    if (cell != null && this.isValidRoot(cell)) {
      this.view.setCurrentRoot(cell)
      this.clearSelection()
    }
  }

  /**
   * Changes the current root to the next valid root in the displayed cell
   * hierarchy.
   */
  exitGroup() {
    const root = this.model.getRoot()
    const current = this.getCurrentRoot()

    if (current != null) {
      let next = this.model.getParent(current)!

      // Finds the next valid root in the hierarchy
      while (next !== root && !this.isValidRoot(next) &&
        this.model.getParent(next) !== root) {
        next = this.model.getParent(next)!
      }

      // Clears the current root if the new root is
      // the model's root or one of the layers.
      if (next === root || this.model.getParent(next) === root) {
        this.view.setCurrentRoot(null)
      } else {
        this.view.setCurrentRoot(next)
      }

      const state = this.view.getState(current)

      // Selects the previous root in the graph
      if (state != null) {
        this.setSelectionCell(current)
      }
    }
  }

  /**
   * Uses the root of the model as the root of the displayed
   * cell hierarchy and selects the previous root.
   */
  home() {
    const current = this.getCurrentRoot()
    if (current != null) {
      this.view.setCurrentRoot(null)
      const state = this.view.getState(current)
      if (state != null) {
        this.setSelectionCell(current)
      }
    }
  }

  /**
   * Returns true if the given cell is a valid root for the cell display
   * hierarchy. This implementation returns true for all non-null values.
   *
   * Parameters:
   *
   * cell - <Cell> which should be checked as a possible root.
   */
  isValidRoot(cell: Cell) {
    return (cell != null)
  }

  // #endregion

  // #region ======== Graph display

  /**
   * Returns the bounds of the visible graph. Shortcut to
   * <mxGraphView.getGraphBounds>. See also: <getBoundingBoxFromGeometry>.
   */
  getGraphBounds() {
    return this.view.getGraphBounds()
  }

  /**
   * Returns the scaled, translated bounds for the given cell. See
   * <mxGraphView.getBounds> for arrays.
   *
   * Parameters:
   *
   * cell - <Cell> whose bounds should be returned.
   * includeEdge - Optional boolean that specifies if the bounds of
   * the connected edges should be included. Default is false.
   * includeDescendants - Optional boolean that specifies if the bounds
   * of all descendants should be included. Default is false.
   */
  getCellBounds(
    cell: Cell,
    includeEdges: boolean = false,
    includeDescendants: boolean = false,
  ) {
    let cells = [cell]

    // Includes all connected edges
    if (includeEdges) {
      cells = cells.concat(this.model.getEdges(cell))
    }

    let result = this.view.getBounds(cells)

    // Recursively includes the bounds of the children
    if (includeDescendants) {
      const childCount = this.model.getChildCount(cell)

      for (let i = 0; i < childCount; i += 1) {
        const tmp = this.getCellBounds(
          this.model.getChildAt(cell, i)!,
          includeEdges,
          true,
        )!

        if (result != null) {
          result.add(tmp)
        } else {
          result = tmp
        }
      }
    }

    return result
  }

  /**
   * Returns the bounding box for the geometries of the vertices in the
   * given array of cells. This can be used to find the graph bounds during
   * a layout operation (ie. before the last endUpdate) as follows:
   *
   * (code)
   * var cells = graph.getChildCells(graph.getDefaultParent(), true, true);
   * var bounds = graph.getBoundingBoxFromGeometry(cells, true);
   * (end)
   *
   * This can then be used to move cells to the origin:
   *
   * (code)
   * if (bounds.x < 0 || bounds.y < 0)
   * {
   *   graph.moveCells(cells, -Math.min(bounds.x, 0), -Math.min(bounds.y, 0))
   * }
   * (end)
   *
   * Or to translate the graph view:
   *
   * (code)
   * if (bounds.x < 0 || bounds.y < 0)
   * {
   *   graph.view.setTranslate(-Math.min(bounds.x, 0), -Math.min(bounds.y, 0));
   * }
   * (end)
   *
   * Parameters:
   *
   * cells - Array of <Cells> whose bounds should be returned.
   * includeEdges - Specifies if edge bounds should be included by computing
   * the bounding box for all points in geometry. Default is false.
   */
  getBoundingBoxFromGeometry(cells: Cell[], includeEdges: boolean = false) {
    let result = null

    if (cells != null) {
      for (let i = 0; i < cells.length; i += 1) {
        if (includeEdges || this.model.isNode(cells[i])) {
          // Computes the bounding box for the points in the geometry
          const geo = this.getCellGeometry(cells[i])

          if (geo != null) {
            let bbox = null

            if (this.model.isEdge(cells[i])) {

              const pts = geo.points
              let tmp = new Rectangle(pts[0].x, pts[0].y, 0, 0)

              const addPoint = (pt: Point | null) => {
                if (pt != null) {
                  if (tmp == null) {
                    tmp = new Rectangle(pt.x, pt.y, 0, 0)
                  } else {
                    tmp.add(new Rectangle(pt.x, pt.y, 0, 0))
                  }
                }
              }

              if (this.model.getTerminal(cells[i], true) == null) {
                addPoint(geo.getTerminalPoint(true))
              }

              if (this.model.getTerminal(cells[i], false) == null) {
                addPoint(geo.getTerminalPoint(false))
              }

              if (pts != null && pts.length > 0) {
                for (let j = 1; j < pts.length; j += 1) {
                  addPoint(pts[j])
                }
              }

              bbox = tmp
            } else {
              const parent = this.model.getParent(cells[i])!

              if (geo.relative) {
                if (this.model.isNode(parent) && parent !== this.view.currentRoot) {
                  const tmp = this.getBoundingBoxFromGeometry([parent], false)

                  if (tmp != null) {
                    bbox = new Rectangle(
                      geo.bounds.x * tmp.width,
                      geo.bounds.y * tmp.height,
                      geo.bounds.width,
                      geo.bounds.height,
                    )

                    if (util.indexOf(cells, parent) >= 0) {
                      bbox.x += tmp.x
                      bbox.y += tmp.y
                    }
                  }
                }
              } else {
                bbox = Rectangle.clone(geo.bounds)

                if (this.model.isNode(parent) && util.indexOf(cells, parent) >= 0) {
                  const tmp = this.getBoundingBoxFromGeometry([parent], false)

                  if (tmp != null) {
                    bbox.x += tmp.x
                    bbox.y += tmp.y
                  }
                }
              }

              if (bbox != null && geo.offset != null) {
                bbox.x += geo.offset.x
                bbox.y += geo.offset.y
              }
            }

            if (bbox != null) {
              if (result == null) {
                result = Rectangle.clone(bbox)
              } else {
                result.add(bbox)
              }
            }
          }
        }
      }
    }

    return result
  }

  /**
   * Clears all cell states or the states for the hierarchy starting at the
   * given cell and validates the graph. This fires a refresh event as the
   * last step.
   *
   * Parameters:
   *
   * cell - Optional <Cell> for which the cell states should be cleared.
   */
  refresh(cell: Cell) {
    this.view.clear(cell, cell == null)
    this.view.validate()
    this.sizeDidChange()
    // this.fireEvent(new DomEventObject(DomEvent.REFRESH))
  }

  /**
   * Snaps the given numeric value to the grid if <gridEnabled> is true.
   *
   * Parameters:
   *
   * value - Numeric value to be snapped to the grid.
   */
  snap(value: number) {
    if (this.gridEnabled) {
      // tslint:disable-next-line
      value = Math.round(value / this.gridSize) * this.gridSize
    }

    return value
  }

  /**
   * Shifts the graph display by the given amount. This is used to preview
   * panning operations, use <mxGraphView.setTranslate> to set a persistent
   * translation of the view. Fires <DomEvent.PAN>.
   *
   * Parameters:
   *
   * dx - Amount to shift the graph along the x-axis.
   * dy - Amount to shift the graph along the y-axis.
   */

  private shiftPreview1: HTMLElement | null
  private shiftPreview2: HTMLElement | null

  panGraph(dx: number, dy: number) {
    if (this.useScrollbarsForPanning && util.hasScrollbars(this.container)) {
      this.container.scrollLeft = -dx
      this.container.scrollTop = -dy
    } else {
      const canvas = this.view.getCanvas()!

      if (this.dialect === constants.DIALECT_SVG) {
        // Puts everything inside the container in a DIV so that it
        // can be moved without changing the state of the container
        if (dx === 0 && dy === 0) {
          // Workaround for ignored removeAttribute on SVG element in IE9 standards
          if (detector.IS_IE) {
            canvas.setAttribute('transform', `translate(${dx},${dy})`)
          } else {
            canvas.removeAttribute('transform')
          }

          if (this.shiftPreview1 != null) {
            let child = this.shiftPreview1.firstChild

            while (child != null) {
              const next = child.nextSibling
              this.container.appendChild(child)
              child = next
            }

            if (this.shiftPreview1.parentNode != null) {
              this.shiftPreview1.parentNode.removeChild(this.shiftPreview1)
            }

            this.shiftPreview1 = null

            this.container.appendChild(canvas.parentNode!)

            child = this.shiftPreview2!.firstChild

            while (child != null) {
              const next = child.nextSibling
              this.container.appendChild(child)
              child = next
            }

            if (this.shiftPreview2!.parentNode != null) {
              this.shiftPreview2!.parentNode.removeChild(this.shiftPreview2!)
            }

            this.shiftPreview2 = null
          }
        } else {
          canvas.setAttribute('transform', `translate(${dx},${dy})`)

          if (this.shiftPreview1 == null) {
            // Needs two divs for stuff before and after the SVG element
            this.shiftPreview1 = document.createElement('div')
            this.shiftPreview1.style.position = 'absolute'
            this.shiftPreview1.style.overflow = 'visible'

            this.shiftPreview2 = document.createElement('div')
            this.shiftPreview2.style.position = 'absolute'
            this.shiftPreview2.style.overflow = 'visible'

            let current = this.shiftPreview1
            let child = this.container.firstChild as HTMLElement

            while (child != null) {
              const next = child.nextSibling as HTMLElement

              // SVG element is moved via transform attribute
              if (child !== canvas.parentNode) {
                current.appendChild(child)
              } else {
                current = this.shiftPreview2
              }

              child = next
            }

            // Inserts elements only if not empty
            if (this.shiftPreview1.firstChild != null) {
              this.container.insertBefore(this.shiftPreview1, canvas.parentNode)
            }

            if (this.shiftPreview2.firstChild != null) {
              this.container.appendChild(this.shiftPreview2)
            }
          }

          this.shiftPreview1.style.left = `${dx}px`
          this.shiftPreview1.style.top = `${dy}px`
          this.shiftPreview2!.style.left = util.toPx(dx)
          this.shiftPreview2!.style.top = util.toPx(dy)
        }
      } else {
        canvas.style.left = util.toPx(dx)
        canvas.style.top = util.toPx(dy)
      }

      this.panDx = dx
      this.panDy = dy

      // this.fireEvent(new DomEventObject(DomEvent.PAN))
    }
  }

  /**
   * Zooms into the graph by <zoomFactor>.
   */
  zoomIn() {
    this.zoom(this.zoomFactor)
  }

  /**
   * Zooms out of the graph by <zoomFactor>.
   */
  zoomOut() {
    this.zoom(1 / this.zoomFactor)
  }

  /**
   * Resets the zoom and panning in the view.
   */
  zoomActual() {
    if (this.view.scale === 1) {
      this.view.setTranslate(0, 0)
    } else {
      this.view.translate.x = 0
      this.view.translate.y = 0

      this.view.setScale(1)
    }
  }

  /**
   * Zooms the graph to the given scale with an optional boolean center
   * argument, which is passd to <zoom>.
   */
  zoomTo(scale: number, center?: boolean) {
    this.zoom(scale / this.view.scale, center)
  }

  /**
   * Centers the graph in the container.
   *
   * Parameters:
   *
   * horizontal - Optional boolean that specifies if the graph should be centered
   * horizontally. Default is true.
   * vertical - Optional boolean that specifies if the graph should be centered
   * vertically. Default is true.
   * cx - Optional float that specifies the horizontal center. Default is 0.5.
   * cy - Optional float that specifies the vertical center. Default is 0.5.
   */
  center(
    horizontal: boolean = true,
    vertical: boolean = true,
    cx: number = 0.5,
    cy: number = 0.5,
  ) {
    const hasScrollbars = util.hasScrollbars(this.container)
    const cw = this.container.clientWidth
    const ch = this.container.clientHeight
    const bounds = this.getGraphBounds()

    const t = this.view.translate
    const s = this.view.scale

    let dx = (horizontal) ? cw - bounds.width : 0
    let dy = (vertical) ? ch - bounds.height : 0

    if (!hasScrollbars) {
      this.view.setTranslate(
        horizontal
          ? Math.floor(t.x - bounds.x * s + dx * cx / s)
          : t.x,
        vertical
          ? Math.floor(t.y - bounds.y * s + dy * cy / s)
          : t.y,
      )
    } else {
      bounds.x -= t.x
      bounds.y -= t.y

      const sw = this.container.scrollWidth
      const sh = this.container.scrollHeight

      if (sw > cw) {
        dx = 0
      }

      if (sh > ch) {
        dy = 0
      }

      this.view.setTranslate(Math.floor(dx / 2 - bounds.x), Math.floor(dy / 2 - bounds.y))
      this.container.scrollLeft = (sw - cw) / 2
      this.container.scrollTop = (sh - ch) / 2
    }
  }

  /**
   * Zooms the graph using the given factor. Center is an optional boolean
   * argument that keeps the graph scrolled to the center. If the center argument
   * is omitted, then <centerZoom> will be used as its value.
   */
  zoom(factor: number, center: boolean = this.centerZoom) {
    const scale = Math.round(this.view.scale * factor * 100) / 100
    const state = this.view.getState(this.getSelectionCell())
    // tslint:disable-next-line
    factor = scale / this.view.scale

    if (this.keepSelectionVisibleOnZoom && state != null) {
      const rect = new Rectangle(
        state.bounds.x * factor,
        state.bounds.y * factor,
        state.bounds.width * factor,
        state.bounds.height * factor,
      )

      // Refreshes the display only once if a scroll is carried out
      this.view.scale = scale

      if (!this.scrollRectToVisible(rect)) {
        this.view.revalidate()

        // Forces an event to be fired but does not revalidate again
        this.view.setScale(scale)
      }
    } else {
      const hasScrollbars = util.hasScrollbars(this.container)

      if (center && !hasScrollbars) {
        let dx = this.container.offsetWidth
        let dy = this.container.offsetHeight

        if (factor > 1) {
          const f = (factor - 1) / (scale * 2)
          dx *= -f
          dy *= -f
        } else {
          const f = (1 / factor - 1) / (this.view.scale * 2)
          dx *= f
          dy *= f
        }

        this.view.scaleAndTranslate(
          scale,
          this.view.translate.x + dx,
          this.view.translate.y + dy,
        )
      } else {
        // Allows for changes of translate and scrollbars during setscale
        const tx = this.view.translate.x
        const ty = this.view.translate.y
        const sl = this.container.scrollLeft
        const st = this.container.scrollTop

        this.view.setScale(scale)

        if (hasScrollbars) {
          let dx = 0
          let dy = 0

          if (center) {
            dx = this.container.offsetWidth * (factor - 1) / 2
            dy = this.container.offsetHeight * (factor - 1) / 2
          }

          this.container.scrollLeft = (this.view.translate.x - tx) * this.view.scale
            + Math.round(sl * factor + dx)
          this.container.scrollTop = (this.view.translate.y - ty) * this.view.scale
            + Math.round(st * factor + dy)
        }
      }
    }
  }

  /**
   * Zooms the graph to the specified rectangle. If the rectangle does not have same aspect
   * ratio as the display container, it is increased in the smaller relative dimension only
   * until the aspect match. The original rectangle is centralised within this expanded one.
   *
   * Note that the input rectangular must be un-scaled and un-translated.
   *
   * Parameters:
   *
   * rect - The un-scaled and un-translated rectangluar region that should be just visible
   * after the operation
   */
  zoomToRect(rect: Rectangle) {
    const scaleX = this.container.clientWidth / rect.width
    const scaleY = this.container.clientHeight / rect.height
    const aspectFactor = scaleX / scaleY

    // Remove any overlap of the rect outside the client area
    rect.x = Math.max(0, rect.x)
    rect.y = Math.max(0, rect.y)
    let rectRight = Math.min(this.container.scrollWidth, rect.x + rect.width)
    let rectBottom = Math.min(this.container.scrollHeight, rect.y + rect.height)
    rect.width = rectRight - rect.x
    rect.height = rectBottom - rect.y

    // The selection area has to be increased to the same aspect
    // ratio as the container, centred around the centre point of the
    // original rect passed in.
    if (aspectFactor < 1.0) {
      // Height needs increasing
      const newHeight = rect.height / aspectFactor
      const deltaHeightBuffer = (newHeight - rect.height) / 2.0
      rect.height = newHeight

      // Assign up to half the buffer to the upper part of the rect, not crossing 0
      // put the rest on the bottom
      const upperBuffer = Math.min(rect.y, deltaHeightBuffer)
      rect.y = rect.y - upperBuffer

      // Check if the bottom has extended too far
      rectBottom = Math.min(this.container.scrollHeight, rect.y + rect.height)
      rect.height = rectBottom - rect.y
    } else {
      // Width needs increasing
      const newWidth = rect.width * aspectFactor
      const deltaWidthBuffer = (newWidth - rect.width) / 2.0
      rect.width = newWidth

      // Assign up to half the buffer to the upper part of the rect, not crossing 0
      // put the rest on the bottom
      const leftBuffer = Math.min(rect.x, deltaWidthBuffer)
      rect.x = rect.x - leftBuffer

      // Check if the right hand side has extended too far
      rectRight = Math.min(this.container.scrollWidth, rect.x + rect.width)
      rect.width = rectRight - rect.x
    }

    const scale = this.container.clientWidth / rect.width
    const newScale = this.view.scale * scale

    if (!util.hasScrollbars(this.container)) {
      this.view.scaleAndTranslate(
        newScale,
        (this.view.translate.x - rect.x / this.view.scale),
        (this.view.translate.y - rect.y / this.view.scale),
      )
    } else {
      this.view.setScale(newScale)
      this.container.scrollLeft = Math.round(rect.x * scale)
      this.container.scrollTop = Math.round(rect.y * scale)
    }
  }

  /**
   * Pans the graph so that it shows the given cell. Optionally the cell may
   * be centered in the container.
   *
   * To center a given graph if the <container> has no scrollbars, use the following code.
   *
   * [code]
   * var bounds = graph.getGraphBounds();
   * graph.view.setTranslate(-bounds.x - (bounds.width - container.clientWidth) / 2,
   * 						   -bounds.y - (bounds.height - container.clientHeight) / 2);
   * [/code]
   *
   * Parameters:
   *
   * cell - <Cell> to be made visible.
   * center - Optional boolean flag. Default is false.
   */
  scrollCellToVisible(cell: Cell, center: boolean = false) {
    const x = -this.view.translate.x
    const y = -this.view.translate.y

    const state = this.view.getState(cell)

    if (state != null) {
      const bounds = new Rectangle(
        x + state.bounds.x,
        y + state.bounds.y,
        state.bounds.width,
        state.bounds.height,
      )

      if (center && this.container != null) {
        const w = this.container.clientWidth
        const h = this.container.clientHeight

        bounds.x = bounds.getCenterX() - w / 2
        bounds.width = w
        bounds.y = bounds.getCenterY() - h / 2
        bounds.height = h
      }

      const tr = new Point(this.view.translate.x, this.view.translate.y)

      if (this.scrollRectToVisible(bounds)) {
        // Triggers an update via the view's event source
        const tr2 = new Point(this.view.translate.x, this.view.translate.y)
        this.view.translate.x = tr.x
        this.view.translate.y = tr.y
        this.view.setTranslate(tr2.x, tr2.y)
      }
    }
  }

  /**
   * Pans the graph so that it shows the given rectangle.
   *
   * Parameters:
   *
   * rect - <Rect> to be made visible.
   */
  scrollRectToVisible(rect: Rectangle) {
    let isChanged = false

    if (rect != null) {
      const w = this.container.offsetWidth
      const h = this.container.offsetHeight

      const widthLimit = Math.min(w, rect.width)
      const heightLimit = Math.min(h, rect.height)

      if (util.hasScrollbars(this.container)) {
        const c = this.container
        rect.x += this.view.translate.x
        rect.y += this.view.translate.y
        let dx = c.scrollLeft - rect.x
        const ddx = Math.max(dx - c.scrollLeft, 0)

        if (dx > 0) {
          c.scrollLeft -= dx + 2
        } else {
          dx = rect.x + widthLimit - c.scrollLeft - c.clientWidth

          if (dx > 0) {
            c.scrollLeft += dx + 2
          }
        }

        let dy = c.scrollTop - rect.y
        const ddy = Math.max(0, dy - c.scrollTop)

        if (dy > 0) {
          c.scrollTop -= dy + 2
        } else {
          dy = rect.y + heightLimit - c.scrollTop - c.clientHeight

          if (dy > 0) {
            c.scrollTop += dy + 2
          }
        }

        if (!this.useScrollbarsForPanning && (ddx !== 0 || ddy !== 0)) {
          this.view.setTranslate(ddx, ddy)
        }
      } else {
        const x = -this.view.translate.x
        const y = -this.view.translate.y

        const s = this.view.scale

        if (rect.x + widthLimit > x + w) {
          this.view.translate.x -= (rect.x + widthLimit - w - x) / s
          isChanged = true
        }

        if (rect.y + heightLimit > y + h) {
          this.view.translate.y -= (rect.y + heightLimit - h - y) / s
          isChanged = true
        }

        if (rect.x < x) {
          this.view.translate.x += (x - rect.x) / s
          isChanged = true
        }

        if (rect.y < y) {
          this.view.translate.y += (y - rect.y) / s
          isChanged = true
        }

        if (isChanged) {
          this.view.refresh()

          // Repaints selection marker (ticket 18)
          if (this.selectionCellsHandler != null) {
            this.selectionCellsHandler.refresh()
          }
        }
      }
    }

    return isChanged
  }

  /**
   * Returns the <mxGeometry> for the given cell. This implementation uses
   * <mxGraphModel.getGeometry>. Subclasses can override this to implement
   * specific geometries for cells in only one graph, that is, it can return
   * geometries that depend on the current state of the view.
   */
  getCellGeometry(cell: Cell) {
    return this.model.getGeometry(cell)
  }

  /**
   * Returns true if the given cell is visible in this graph. This
   * implementation uses <mxGraphModel.isVisible>. Subclassers can override
   * this to implement specific visibility for cells in only one graph, that
   * is, without affecting the visible state of the cell.
   *
   * When using dynamic filter expressions for cell visibility, then the
   * graph should be revalidated after the filter expression has changed.
   *
   * Parameters:
   *
   * cell - <Cell> whose visible state should be returned.
   */
  isCellVisible(cell: Cell | null) {
    return cell != null ? this.model.isVisible(cell) : false
  }

  /**
   * Returns `true` if the given cell is collapsed in this graph.
   */
  isCellCollapsed(cell: Cell) {
    return this.model.isCollapsed(cell)
  }

  /**
   * Returns true if the given cell is connectable in this graph. This
   * implementation uses <mxGraphModel.isConnectable>. Subclassers can override
   * this to implement specific connectable states for cells in only one graph,
   * that is, without affecting the connectable state of the cell in the model.
   *
   * Parameters:
   *
   * cell - <Cell> whose connectable state should be returned.
   */
  isCellConnectable(cell: Cell) {
    return this.model.isConnectable(cell)
  }

  /**
   * Returns true if perimeter points should be computed such that the
   * resulting edge has only horizontal or vertical segments.
   */
  isOrthogonal(edgeState: CellState) {
    const orthogonal = edgeState.style[StyleName.orthogonal]
    if (orthogonal != null) {
      return orthogonal === '1'
    }

    const tmp = this.view.getEdgeFunction(edgeState)
    return (
      tmp === EdgeStyle.segmentConnector ||
      tmp === EdgeStyle.elbowConnector ||
      tmp === EdgeStyle.sideToSide ||
      tmp === EdgeStyle.topToBottom ||
      tmp === EdgeStyle.entityRelation ||
      tmp === EdgeStyle.orthConnector
    )
  }

  /**
   * Returns true if the given cell state is a loop.
   *
   * Parameters:
   *
   * state - <CellState> that represents a potential loop.
   */
  isLoop(state: CellState) {
    const src = state.getVisibleTerminalState(true)
    const trg = state.getVisibleTerminalState(false)

    return (src != null && src === trg)
  }

  /**
   * Returns true if the given event is a clone event. This implementation
   * returns true if control is pressed.
   */
  isCloneEvent(e: MouseEvent) {
    return DomEvent.isControlDown(e)
  }

  /**
   * Hook for implementing click-through behaviour on selected cells. If this
   * returns true the cell behind the selected cell will be selected. This
   * implementation returns false;
   */
  isTransparentClickEvent(e: MouseEvent) {
    return false
  }

  /**
   * Returns true if the given event is a toggle event. This implementation
   * returns true if the meta key (Cmd) is pressed on Macs or if control is
   * pressed on any other platform.
   */
  isToggleEvent(e: MouseEvent) {
    return detector.IS_MAC ? DomEvent.isMetaDown(e) : DomEvent.isControlDown(e)
  }

  /**
   * Returns true if the given mouse event should be aligned to the grid.
   */
  isGridEnabledEvent(e: MouseEvent) {
    return e != null && !DomEvent.isAltDown(e)
  }

  /**
   * Returns true if the given mouse event should be aligned to the grid.
   */
  isConstrainedEvent(e: MouseEvent) {
    return DomEvent.isShiftDown(e)
  }

  /**
   * Returns true if the given mouse event should not allow any connections to be
   * made. This implementation returns false.
   */
  isIgnoreTerminalEvent(e: MouseEvent) {
    return false
  }

  // #endregion

  // #region ======== Validation

  /**
   * Displays the given validation error in a dialog. This implementation uses
   * util.alert.
   */
  validationAlert(message: string) {
    // TOOD: trigger an event
    // util.alert(message)
  }

  /**
   * Checks if the return value of <getEdgeValidationError> for the given
   * arguments is null.
   *
   * Parameters:
   *
   * edge - <Cell> that represents the edge to validate.
   * source - <Cell> that represents the source terminal.
   * target - <Cell> that represents the target terminal.
   */
  isEdgeValid(edge: Cell, source: Cell, target: Cell) {
    return this.getEdgeValidationError(edge, source, target) == null
  }

  /**
   * Returns the validation error message to be displayed when inserting or
   * changing an edges' connectivity. A return value of null means the edge
   * is valid, a return value of '' means it's not valid, but do not display
   * an error message. Any other (non-empty) string returned from this method
   * is displayed as an error message when trying to connect an edge to a
   * source and target. This implementation uses the <multiplicities>, and
   * checks <multigraph>, <allowDanglingEdges> and <allowLoops> to generate
   * validation errors.
   *
   * For extending this method with specific checks for source/target cells,
   * the method can be extended as follows. Returning an empty string means
   * the edge is invalid with no error message, a non-null string specifies
   * the error message, and null means the edge is valid.
   *
   * (code)
   * graph.getEdgeValidationError (edge, source, target)
   * {
   *   if (source != null && target != null &&
   *     this.model.getValue(source) != null &&
   *     this.model.getValue(target) != null)
   *   {
   *     if (target is not valid for source)
   *     {
   *       return 'Invalid Target';
   *     }
   *   }
   *
   *   // "Supercall"
   *   return getEdgeValidationError.apply(this, arguments);
   * }
   * (end)
   *
   * Parameters:
   *
   * edge - <Cell> that represents the edge to validate.
   * source - <Cell> that represents the source terminal.
   * target - <Cell> that represents the target terminal.
   */
  getEdgeValidationError(edge: Cell, source: Cell, target: Cell) {
    if (edge != null && !this.isAllowDanglingEdges() && (source == null || target == null)) {
      return ''
    }

    if (edge != null && this.model.getTerminal(edge, true) == null &&
      this.model.getTerminal(edge, false) == null) {
      return null
    }

    // Checks if we're dealing with a loop
    if (!this.allowLoops && source === target && source != null) {
      return ''
    }

    // Checks if the connection is generally allowed
    if (!this.isValidConnection(source, target)) {
      return ''
    }

    if (source != null && target != null) {
      let error = ''

      // Checks if the cells are already connected
      // and adds an error message if required
      if (!this.multigraph) {
        const tmp = this.model.getEdgesBetween(source, target, true)

        // Checks if the source and target are not connected by another edge
        if (tmp.length > 1 || (tmp.length === 1 && tmp[0] !== edge)) {
          error += `(mxResources.get(this.alreadyConnectedResource) ||
            this.alreadyConnectedResource)`
        }
      }

      // Gets the number of outgoing edges from the source
      // and the number of incoming edges from the target
      // without counting the edge being currently changed.
      const sourceOut = this.model.getDirectedEdgeCount(source, true, edge)
      const targetIn = this.model.getDirectedEdgeCount(target, false, edge)

      // Checks the change against each multiplicity rule
      if (this.multiplicities != null) {
        for (let i = 0; i < this.multiplicities.length; i += 1) {
          const err = this.multiplicities[i].check(
            this, edge, source, target, sourceOut, targetIn,
          )

          if (err != null) {
            error += err
          }
        }
      }

      // Validates the source and target terminals independently
      const err = this.validateEdge(edge, source, target)

      if (err != null) {
        error += err
      }

      return (error.length > 0) ? error : null
    }

    return (this.allowDanglingEdges) ? null : ''
  }

  /**
   * Hook method for subclassers to return an error message for the given
   * edge and terminals. This implementation returns null.
   *
   * Parameters:
   *
   * edge - <Cell> that represents the edge to validate.
   * source - <Cell> that represents the source terminal.
   * target - <Cell> that represents the target terminal.
   */
  validateEdge(edge: Cell, source: Cell, target: Cell) {
    return null
  }

  /**
   * Validates the graph by validating each descendant of the given cell or
   * the root of the model. Context is an object that contains the validation
   * state for the complete validation run. The validation errors are
   * attached to their cells using <setCellWarning>. Returns null in the case of
   * successful validation or an array of strings (warnings) in the case of
   * failed validations.
   *
   * Paramters:
   *
   * cell - Optional <Cell> to start the validation recursion. Default is
   * the graph root.
   * context - Object that represents the global validation state.
   */
  validateGraph(
    cell: Cell = this.model.getRoot(),
    context: any = {},
  ): string | null {

    let isValid = true
    const childCount = this.model.getChildCount(cell)

    for (let i = 0; i < childCount; i += 1) {
      const tmp = this.model.getChildAt(cell, i)!
      let ctx = context

      if (this.isValidRoot(tmp)) {
        ctx = new Object()
      }

      const warn: string | null = this.validateGraph(tmp, ctx)
      if (warn != null) {
        this.setCellWarning(tmp, warn.replace(/\n/g, '<br>'))
      } else {
        this.setCellWarning(tmp, null)
      }

      isValid = isValid && warn == null
    }

    let warning = ''

    // Adds error for invalid children if collapsed (children invisible)
    if (this.isCellCollapsed(cell) && !isValid) {
      warning += ` (mxResources.get(this.containsValidationErrorsResource) ||
        this.containsValidationErrorsResource)`
    }

    // Checks edges and cells using the defined multiplicities
    if (this.model.isEdge(cell)) {
      warning += this.getEdgeValidationError(
        cell,
        this.model.getTerminal(cell, true)!,
        this.model.getTerminal(cell, false)!,
      ) || ''
    } else {
      warning += this.getCellValidationError(cell) || ''
    }

    // Checks custom validation rules
    const err = this.validateCell(cell, context)

    if (err != null) {
      warning += err
    }

    // Updates the display with the warning icons
    // before any potential alerts are displayed.
    // LATER: Move this into addCellOverlay. Redraw
    // should check if overlay was added or removed.
    if (this.model.getParent(cell) == null) {
      this.view.validate()
    }

    return (warning.length > 0 || !isValid) ? warning as string : null
  }

  /**
   * Checks all <multiplicities> that cannot be enforced while the graph is
   * being modified, namely, all multiplicities that require a minimum of
   * 1 edge.
   *
   * Parameters:
   *
   * cell - <Cell> for which the multiplicities should be checked.
   */
  getCellValidationError(cell: Cell) {
    const outCount = this.model.getDirectedEdgeCount(cell, true)
    const inCount = this.model.getDirectedEdgeCount(cell, false)
    const value = this.model.getData(cell)
    let error = ''

    if (this.multiplicities != null) {
      for (let i = 0; i < this.multiplicities.length; i += 1) {
        const rule = this.multiplicities[i]

        if (
          rule.source &&
          util.isHTMLNode(value, rule.type, rule.attr, rule.value) &&
          (outCount > rule.max || outCount < rule.min)
        ) {
          error += `${rule.countError}\n`
        } else if (
          !rule.source &&
          util.isHTMLNode(value, rule.type, rule.attr, rule.value) &&
          (inCount > rule.max || inCount < rule.min)
        ) {
          error += `${rule.countError}\n`
        }
      }
    }

    return (error.length > 0) ? error : null
  }

  /**
   * Hook method for subclassers to return an error message for the given
   * cell and validation context. This implementation returns null. Any HTML
   * breaks will be converted to linefeeds in the calling method.
   *
   * Parameters:
   *
   * cell - <Cell> that represents the cell to validate.
   * context - Object that represents the global validation state.
   */
  validateCell(cell: Cell, context: any) {
    return null
  }

  // #endregion

  // #region ======== Graph appearance

  /**
   * Returns the <backgroundImage> as an <mxImage>.
   */
  getBackgroundImage() {
    return this.backgroundImage
  }

  /**
   * Sets the new <backgroundImage>.
   *
   * Parameters:
   *
   * image - New <mxImage> to be used for the background.
   */
  setBackgroundImage(image: Image) {
    this.backgroundImage = image
  }

  /**
   * Returns the <mxImage> used to display the collapsed state of
   * the specified cell state. This returns null for all edges.
   */
  getFoldingImage(state: CellState) {
    if (
      state != null &&
      this.foldingEnabled &&
      !this.getModel().isEdge(state.cell)
    ) {
      const collapsed = this.isCellCollapsed(state.cell)
      if (this.isCellFoldable(state.cell, !collapsed)) {
        return (collapsed) ? this.collapsedImage : this.expandedImage
      }
    }

    return null
  }

  /**
   * Returns the textual representation for the given cell.
   */
  convertValueToString(cell: Cell) {
    const value = this.model.getData(cell)
    if (value != null) {
      if (util.isHTMLNode(value)) {
        return value.nodeName
      }

      if (typeof (value.toString) === 'function') {
        return value.toString()
      }
    }

    return ''
  }

  /**
   * Returns a string or DOM node that represents the label for the given cell.
   */
  getLabel(cell: Cell) {
    let result = ''

    if (this.labelsVisible && cell != null) {
      const state = this.view.getState(cell)
      const style = (state != null) ? state.style : this.getCellStyle(cell)

      if (!util.getBooleanFromStyle(style, StyleName.noLabel)) {
        result = this.convertValueToString(cell)
      }
    }

    return result
  }

  /**
   * Returns true if the label must be rendered as HTML markup.
   */
  isHtmlLabel(cell: Cell) {
    return this.isHtmlLabels()
  }

  isHtmlLabels() {
    return this.htmlLabels
  }

  setHtmlLabels(value: boolean) {
    this.htmlLabels = value
  }

  /**
   * This enables wrapping for HTML labels.
   *
   * Returns true if no white-space CSS style directive should be used for
   * displaying the given cells label. This implementation returns true if
   * <constants.STYLE_WHITE_SPACE> in the style of the given cell is 'wrap'.
   *
   * This is used as a workaround for IE ignoring the white-space directive
   * of child elements if the directive appears in a parent element. It
   * should be overridden to return true if a white-space directive is used
   * in the HTML markup that represents the given cells label. In order for
   * HTML markup to work in labels, <isHtmlLabel> must also return true
   * for the given cell.
   *
   * Example:
   *
   * (code)
   * graph.getLabel (cell)
   * {
   *   var tmp = getLabel.apply(this, arguments); // "supercall"
   *
   *   if (this.model.isEdge(cell))
   *   {
   *     tmp = '<div style="width: 150px; white-space:normal;">'+tmp+'</div>';
   *   }
   *
   *   return tmp;
   * }
   *
   * graph.isWrapping (state)
   * {
   * 	 return this.model.isEdge(state.cell);
   * }
   * (end)
   *
   * Makes sure no edge label is wider than 150 pixels, otherwise the content
   * is wrapped. Note: No width must be specified for wrapped vertex labels as
   * the vertex defines the width in its geometry.
   *
   * Parameters:
   *
   * state - <Cell> whose label should be wrapped.
   */
  isWrapping(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return style != null ? style[StyleName.whiteSpace] === 'wrap' : false
  }

  /**
   * Returns true if the overflow portion of labels should be hidden. If this
   * returns true then vertex labels will be clipped to the size of the vertices.
   * This implementation returns true if <constants.STYLE_OVERFLOW> in the
   * style of the given cell is 'hidden'.
   *
   * Parameters:
   *
   * state - <Cell> whose label should be clipped.
   */
  isLabelClipped(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return (style != null) ? style[StyleName.overflow] === 'hidden' : false
  }

  /**
   * Returns the string or DOM node that represents the tooltip for the given
   * state, node and coordinate pair. This implementation checks if the given
   * node is a folding icon or overlay and returns the respective tooltip. If
   * this does not result in a tooltip, the handler for the cell is retrieved
   * from <selectionCellsHandler> and the optional getTooltipForNode method is
   * called. If no special tooltip exists here then <getTooltipForCell> is used
   * with the cell in the given state as the argument to return a tooltip for the
   * given state.
   *
   * Parameters:
   *
   * state - <CellState> whose tooltip should be returned.
   * node - DOM node that is currently under the mouse.
   * x - X-coordinate of the mouse.
   * y - Y-coordinate of the mouse.
   */
  getTooltip(state: CellState, node: HTMLElement, x: number, y: number) {
    let tip: string | null = null

    if (state != null) {
      // Checks if the mouse is over the folding icon
      if (
        state.control != null && (
          node === state.control.elem || node.parentNode === state.control.elem)
      ) {
        tip = 'this.collapseExpandResource'
        // tip = util.escape(mxResources.get(tip) || tip).replace(/\\n/g, '<br>')
      }

      if (tip == null && state.overlaySet != null) {
        state.overlaySet.forEach((overlay) => {
          const shape = state.overlayMap!.get(overlay)!
          if (tip == null &&
            (node === shape.elem || node.parentNode === shape.elem)
          ) {
            tip = shape.overlay!.toString()
          }
        })
      }

      if (tip == null) {
        const handler = this.selectionCellsHandler.getHandler(state.cell)

        if (handler != null && typeof (handler.getTooltipForNode) === 'function') {
          tip = handler.getTooltipForNode(node)
        }
      }

      if (tip == null) {
        tip = this.getTooltipForCell(state.cell)
      }
    }

    return tip
  }

  /**
   * Returns the string or DOM node to be used as the tooltip for the given
   * cell. This implementation uses the cells getTooltip function if it
   * exists, or else it returns <convertValueToString> for the cell.
   *
   * Example:
   *
   * (code)
   * graph.getTooltipForCell (cell)
   * {
   *   return 'Hello, World!';
   * }
   * (end)
   *
   * Replaces all tooltips with the string Hello, World!
   *
   * Parameters:
   *
   * cell - <Cell> whose tooltip should be returned.
   */
  getTooltipForCell(cell: Cell) {
    let tip = null

    // if (cell != null && cell.getTooltip != null) {
    //   tip = cell.getTooltip()
    // } else {
    //   tip = this.convertValueToString(cell)
    // }

    tip = this.convertValueToString(cell)

    return tip
  }

  /**
   * Returns the string to be used as the link for the given cell. This
   * implementation returns null.
   *
   * Parameters:
   *
   * cell - <Cell> whose tooltip should be returned.
   */
  getLinkForCell(cell: Cell) {
    return null
  }

  /**
   * Returns the cursor value to be used for the CSS of the shape for the
   * given event. This implementation calls <getCursorForCell>.
   *
   * Parameters:
   *
   * me - <mxMouseEvent> whose cursor should be returned.
   */
  getCursorForMouseEvent(e: CustomMouseEvent) {
    return this.getCursorForCell(e.getCell()!)
  }

  /**
   * Returns the cursor value to be used for the CSS of the shape for the
   * given cell. This implementation returns null.
   *
   * Parameters:
   *
   * cell - <Cell> whose cursor should be returned.
   */
  getCursorForCell(cell: Cell) {
    return null
  }

  /**
   * Returns the start size of the given swimlane, that is, the width or
   * height of the part that contains the title, depending on the
   * horizontal style. The return value is an <Rect> with either
   * width or height set as appropriate.
   *
   * Parameters:
   *
   * swimlane - <Cell> whose start size should be returned.
   */
  getStartSize(swimlane: Cell) {
    const result = new Rectangle()
    const state = this.view.getState(swimlane)
    const style = (state != null) ? state.style : this.getCellStyle(swimlane)

    if (style != null) {
      const size = util.getNumber(style, StyleName.startSize, constants.DEFAULT_STARTSIZE)

      if (util.getValue(style, constants.STYLE_HORIZONTAL, true)) {
        result.height = size
      } else {
        result.width = size
      }
    }

    return result
  }

  /**
   * Returns the image URL for the given cell state.
   */
  getImage(state: CellState): string | null {
    return (state != null && state.style != null)
      ? state.style[StyleName.image]
      : null
  }

  /**
   * Returns the vertical alignment for the given cell state.
   */
  getVerticalAlign(state: CellState) {
    return (state != null && state.style != null)
      ? (state.style[StyleName.verticalAlign] || Align.middle)
      : null
  }

  /**
   * Returns the indicator color for the given cell state.
   */
  getIndicatorColor(state: CellState) {
    return (state != null && state.style != null)
      ? state.style[StyleName.indicatorColor]
      : null
  }

  /**
   * Returns the indicator gradient color for the given cell state.
   */
  getIndicatorGradientColor(state: CellState) {
    return (state != null && state.style != null)
      ? state.style[StyleName.indicatorGradientColor]
      : null
  }

  /**
   * Returns the indicator shape for the given cell state.
   */
  getIndicatorShape(state: CellState) {
    return (state != null && state.style != null)
      ? state.style[StyleName.indicatorShape]
      : null
  }

  /**
   * Returns the indicator image for the given cell state.
   */
  getIndicatorImage(state: CellState) {
    return (state != null && state.style != null)
      ? state.style[StyleName.indicatorImage]
      : null
  }

  getBorder() {
    return this.border
  }

  setBorder(value: number) {
    this.border = value
  }

  /**
   * Returns true if the given cell is a swimlane in the graph. A swimlane is
   * a container cell with some specific behaviour. This implementation
   * checks if the shape associated with the given cell is a <mxSwimlane>.
   *
   * Parameters:
   *
   * cell - <Cell> to be checked.
   */
  isSwimlane(cell: Cell) {
    if (cell != null) {
      if (this.model.getParent(cell) !== this.model.getRoot()) {
        const state = this.view.getState(cell)
        const style = (state != null) ? state.style : this.getCellStyle(cell)

        if (style != null && !this.model.isEdge(cell)) {
          return style[constants.STYLE_SHAPE] === constants.SHAPE_SWIMLANE
        }
      }
    }

    return false
  }

  // #endregion

  // #region ======== Graph behaviour

  isResizeContainer() {
    return this.resizeContainer
  }

  setResizeContainer(value: boolean) {
    this.resizeContainer = value
  }

  isEnabled() {
    return this.enabled
  }

  /**
   * Specifies if the graph should allow any interactions.
   */
  setEnabled(value: boolean) {
    this.enabled = value
  }

  isEscapeEnabled() {
    return this.escapeEnabled
  }

  setEscapeEnabled(value: boolean) {
    this.escapeEnabled = value
  }

  isInvokesStopCellEditing() {
    return this.invokesStopCellEditing
  }

  setInvokesStopCellEditing(value: boolean) {
    this.invokesStopCellEditing = value
  }

  isEnterStopsCellEditing() {
    return this.enterStopsCellEditing
  }

  setEnterStopsCellEditing(value: boolean) {
    this.enterStopsCellEditing = value
  }

  /**
   * Returns true if the given cell may not be moved, sized, bended,
   * disconnected, edited or selected. This implementation returns true for
   * all vertices with a relative geometry if <locked> is false.
   *
   * Parameters:
   *
   * cell - <Cell> whose locked state should be returned.
   */
  isCellLocked(cell: Cell) {
    const geometry = this.model.getGeometry(cell)
    return (
      this.isCellsLocked() || (geometry != null &&
        this.model.isNode(cell) && geometry.relative)
    )
  }

  /**
   * Returns true if the given cell may not be moved, sized, bended,
   * disconnected, edited or selected. This implementation returns true for
   * all vertices with a relative geometry if <locked> is false.
   *
   * Parameters:
   *
   * cell - <Cell> whose locked state should be returned.
   */
  isCellsLocked() {
    return this.cellsLocked
  }

  /**
   * Sets if any cell may be moved, sized, bended, disconnected, edited or
   * selected.
   *
   * Parameters:
   *
   * value - Boolean that defines the new value for <cellsLocked>.
   */
  setCellsLocked(value: boolean) {
    this.cellsLocked = value
  }

  /**
   * Returns the cells which may be exported in the given array of cells.
   */
  getCloneableCells(cells: Cell[]) {
    return this.model.filterCells(cells, cell => this.isCellCloneable(cell))
  }

  /**
   * Returns true if the given cell is cloneable. This implementation returns
   * <isCellsCloneable> for all cells unless a cell style specifies
   * <constants.STYLE_CLONEABLE> to be 0.
   *
   * Parameters:
   *
   * cell - Optional <Cell> whose cloneable state should be returned.
   */
  isCellCloneable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isCellsCloneable() && style[constants.STYLE_CLONEABLE] !== '0'
  }

  /**
   * Returns <cellsCloneable>, that is, if the graph allows cloning of cells
   * by using control-drag.
   */
  isCellsCloneable() {
    return this.cellsCloneable
  }

  /**
   * Specifies if the graph should allow cloning of cells by holding down the
   * control key while cells are being moved. This implementation updates
   * <cellsCloneable>.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph should be cloneable.
   */
  setCellsCloneable(value: boolean) {
    this.cellsCloneable = value
  }

  /**
   * Returns the cells which may be exported in the given array of cells.
   */
  getExportableCells(cells: Cell[]) {
    return this.model.filterCells(cells, cell => this.canExportCell(cell))
  }

  /**
   * Returns true if the given cell may be exported to the clipboard. This
   * implementation returns <exportEnabled> for all cells.
   *
   * Parameters:
   *
   * cell - <Cell> that represents the cell to be exported.
   */
  canExportCell(cell: Cell) {
    return this.exportEnabled
  }

  /**
   * Returns the cells which may be imported in the given array of cells.
   */
  getImportableCells(cells: Cell[]) {
    return this.model.filterCells(cells, cell => this.canImportCell(cell))
  }

  /**
   * Returns true if the given cell may be imported from the clipboard.
   * This implementation returns <importEnabled> for all cells.
   *
   * Parameters:
   *
   * cell - <Cell> that represents the cell to be imported.
   */
  canImportCell(cell: Cell) {
    return this.importEnabled
  }

  /**
   * Returns true if the given cell is selectable. This implementation
   * returns <cellsSelectable>.
   *
   * To add a new style for making cells (un)selectable, use the following code.
   *
   * (code)
   * isCellSelectable (cell)
   * {
   *   var state = this.view.getState(cell);
   *   var style = (state != null) ? state.style : this.getCellStyle(cell);
   *
   *   return this.isCellsSelectable() && !this.isCellLocked(cell) && style['selectable'] != 0;
   * };
   * (end)
   *
   * You can then use the new style as shown in this example.
   *
   * (code)
   * graph.insertVertex(parent, null, 'Hello,', 20, 20, 80, 30, 'selectable=0');
   * (end)
   *
   * Parameters:
   *
   * cell - <Cell> whose selectable state should be returned.
   */
  isCellSelectable(cell: Cell) {
    return this.isCellsSelectable()
  }

  /**
   * Returns <cellsSelectable>.
   */
  isCellsSelectable() {
    return this.cellsSelectable
  }

  /**
   * Sets <cellsSelectable>.
   */
  setCellsSelectable(value: boolean) {
    this.cellsSelectable = value
  }

  /**
   * Returns the cells which may be exported in the given array of cells.
   */
  getDeletableCells(cells: Cell[]) {
    return this.model.filterCells(cells, cell => this.isCellDeletable(cell))
  }

  /**
   * Returns true if the given cell is moveable. This returns
   * <cellsDeletable> for all given cells if a cells style does not specify
   * <constants.STYLE_DELETABLE> to be 0.
   *
   * Parameters:
   *
   * cell - <Cell> whose deletable state should be returned.
   */
  isCellDeletable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isCellsDeletable() && style[StyleName.deletable] !== '0'
  }

  /**
   * Returns <cellsDeletable>.
   */
  isCellsDeletable() {
    return this.cellsDeletable
  }

  /**
   * Sets <cellsDeletable>.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph should allow deletion of cells.
   */
  setCellsDeletable(value: boolean) {
    this.cellsDeletable = value
  }

  /**
   * Returns true if the given edges's label is moveable. This returns
   * <movable> for all given cells if <isLocked> does not return true
   * for the given cell.
   *
   * Parameters:
   *
   * cell - <Cell> whose label should be moved.
   */
  isLabelMovable(cell: Cell) {
    return !this.isCellLocked(cell) &&
      ((this.model.isEdge(cell) && this.edgeLabelsMovable) ||
        (this.model.isNode(cell) && this.vertexLabelsMovable))
  }

  /**
   * Returns true if the given cell is rotatable. This returns true for the given
   * cell if its style does not specify <constants.STYLE_ROTATABLE> to be 0.
   *
   * Parameters:
   *
   * cell - <Cell> whose rotatable state should be returned.
   */
  isCellRotatable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return style[constants.STYLE_ROTATABLE] !== '0'
  }

  /**
   * Returns the cells which are movable in the given array of cells.
   */
  getMovableCells(cells: Cell[]) {
    return this.model.filterCells(cells, cell => this.isCellMovable(cell))
  }

  /**
   * Returns true if the given cell is moveable. This returns <cellsMovable>
   * for all given cells if <isCellLocked> does not return true for the given
   * cell and its style does not specify <constants.STYLE_MOVABLE> to be 0.
   *
   * Parameters:
   *
   * cell - <Cell> whose movable state should be returned.
   */
  isCellMovable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isCellsMovable() &&
      !this.isCellLocked(cell) &&
      style[constants.STYLE_MOVABLE] !== '0'
  }

  /**
   * Returns <cellsMovable>.
   */
  isCellsMovable() {
    return this.cellsMovable
  }

  /**
   * Specifies if the graph should allow moving of cells. This implementation
   * updates <cellsMsovable>.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph should allow moving of cells.
   */
  setCellsMovable(value: boolean) {
    this.cellsMovable = value
  }

  /**
   * Returns <gridEnabled> as a boolean.
   */
  isGridEnabled() {
    return this.gridEnabled
  }

  /**
   * Specifies if the grid should be enabled.
   *
   * Parameters:
   *
   * value - Boolean indicating if the grid should be enabled.
   */
  setGridEnabled(value: boolean) {
    this.gridEnabled = value
  }

  /**
   * Returns <portsEnabled> as a boolean.
   */
  isPortsEnabled() {
    return this.portsEnabled
  }

  /**
   * Specifies if the ports should be enabled.
   *
   * Parameters:
   *
   * value - Boolean indicating if the ports should be enabled.
   */
  setPortsEnabled(value: boolean) {
    this.portsEnabled = value
  }

  /**
   * Returns <gridSize>.
   */
  getGridSize() {
    return this.gridSize
  }

  /**
   * Sets <gridSize>.
   */
  setGridSize(value: number) {
    this.gridSize = value
  }

  /**
   * Returns <tolerance>.
   */
  getTolerance() {
    return this.tolerance
  }

  /**
   * Sets <tolerance>.
   */
  setTolerance(value: number) {
    this.tolerance = value
  }

  /**
   * Returns <vertexLabelsMovable>.
   */
  isNodeLabelsMovable() {
    return this.vertexLabelsMovable
  }

  /**
   * Sets <vertexLabelsMovable>.
   */
  setVertexLabelsMovable(value: boolean) {
    this.vertexLabelsMovable = value
  }

  /**
   * Returns <edgeLabelsMovable>.
   */
  isEdgeLabelsMovable() {
    return this.edgeLabelsMovable
  }

  /**
   * Sets <edgeLabelsMovable>.
   */
  setEdgeLabelsMovable(value: boolean) {
    this.edgeLabelsMovable = value
  }

  /**
   * Returns <swimlaneNesting> as a boolean.
   */
  isSwimlaneNesting() {
    return this.swimlaneNesting
  }

  /**
   * Specifies if swimlanes can be nested by drag and drop. This is only
   * taken into account if dropEnabled is true.
   *
   * Parameters:
   *
   * value - Boolean indicating if swimlanes can be nested.
   */
  setSwimlaneNesting(value: boolean) {
    this.swimlaneNesting = value
  }

  /**
   * Returns <swimlaneSelectionEnabled> as a boolean.
   */
  isSwimlaneSelectionEnabled() {
    return this.swimlaneSelectionEnabled
  }

  /**
   * Specifies if swimlanes should be selected if the mouse is released
   * over their content area.
   *
   * Parameters:
   *
   * value - Boolean indicating if swimlanes content areas
   * should be selected when the mouse is released over them.
   */
  setSwimlaneSelectionEnabled(value: boolean) {
    this.swimlaneSelectionEnabled = value
  }

  /**
   * Returns <multigraph> as a boolean.
   */
  isMultigraph() {
    return this.multigraph
  }

  /**
   * Specifies if the graph should allow multiple connections between the
   * same pair of vertices.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph allows multiple connections
   * between the same pair of vertices.
   */
  setMultigraph(value: boolean) {
    this.multigraph = value
  }

  /**
   * Returns <allowLoops> as a boolean.
   */
  isAllowLoops() {
    return this.allowLoops
  }

  /**
   * Specifies if dangling edges are allowed, that is, if edges are allowed
   * that do not have a source and/or target terminal defined.
   *
   * Parameters:
   *
   * value - Boolean indicating if dangling edges are allowed.
   */
  setAllowDanglingEdges(value: boolean) {
    this.allowDanglingEdges = value
  }

  /**
   * Returns <allowDanglingEdges> as a boolean.
   */
  isAllowDanglingEdges() {
    return this.allowDanglingEdges
  }

  /**
   * Specifies if edges should be connectable.
   *
   * Parameters:
   *
   * value - Boolean indicating if edges should be connectable.
   */
  setConnectableEdges(value: boolean) {
    this.connectableEdges = value
  }

  /**
   * Returns <connectableEdges> as a boolean.
   */
  isConnectableEdges() {
    return this.connectableEdges
  }

  /**
   * Specifies if edges should be inserted when cloned but not valid wrt.
   * <getEdgeValidationError>. If false such edges will be silently ignored.
   *
   * Parameters:
   *
   * value - Boolean indicating if cloned invalid edges should be
   * inserted into the graph or ignored.
   */
  setCloneInvalidEdges(value: boolean) {
    this.cloneInvalidEdges = value
  }

  /**
   * Returns <cloneInvalidEdges> as a boolean.
   */
  isCloneInvalidEdges() {
    return this.cloneInvalidEdges
  }

  /**
   * Specifies if loops are allowed.
   *
   * Parameters:
   *
   * value - Boolean indicating if loops are allowed.
   */
  setAllowLoops(value: boolean) {
    this.allowLoops = value
  }

  /**
   * Returns <disconnectOnMove> as a boolean.
   */
  isDisconnectOnMove() {
    return this.disconnectOnMove
  }

  /**
   * Specifies if edges should be disconnected when moved. (Note: Cloned
   * edges are always disconnected.)
   *
   * Parameters:
   *
   * value - Boolean indicating if edges should be disconnected
   * when moved.
   */
  setDisconnectOnMove(value: boolean) {
    this.disconnectOnMove = value
  }

  /**
   * Returns <dropEnabled> as a boolean.
   */
  isDropEnabled() {
    return this.dropEnabled
  }

  /**
   * Specifies if the graph should allow dropping of cells onto or into other
   * cells.
   *
   * Parameters:
   *
   * dropEnabled - Boolean indicating if the graph should allow dropping
   * of cells into other cells.
   */
  setDropEnabled(value: boolean) {
    this.dropEnabled = value
  }

  /**
   * Returns <splitEnabled> as a boolean.
   */
  isSplitEnabled() {
    return this.splitEnabled
  }

  /**
   * Specifies if the graph should allow dropping of cells onto or into other
   * cells.
   *
   * Parameters:
   *
   * dropEnabled - Boolean indicating if the graph should allow dropping
   * of cells into other cells.
   */
  setSplitEnabled(value: boolean) {
    this.splitEnabled = value
  }

  /**
   * Returns true if the given cell is resizable. This returns
   * <cellsResizable> for all given cells if <isCellLocked> does not return
   * true for the given cell and its style does not specify
   * <constants.STYLE_RESIZABLE> to be 0.
   *
   * Parameters:
   *
   * cell - <Cell> whose resizable state should be returned.
   */
  isCellResizable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isCellsResizable() && !this.isCellLocked(cell) &&
      util.getValue(style, constants.STYLE_RESIZABLE, '1') !== '0'
  }

  /**
   * Returns <cellsResizable>.
   */
  isCellsResizable() {
    return this.cellsResizable
  }

  /**
   * Specifies if the graph should allow resizing of cells. This
   * implementation updates <cellsResizable>.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph should allow resizing of
   * cells.
   */
  setCellsResizable(value: boolean) {
    this.cellsResizable = value
  }

  /**
   * Returns true if the given terminal point is movable. This is independent
   * from <isCellConnectable> and <isCellDisconnectable> and controls if terminal
   * points can be moved in the graph if the edge is not connected. Note that it
   * is required for this to return true to connect unconnected edges. This
   * implementation returns true.
   *
   * Parameters:
   *
   * cell - <Cell> whose terminal point should be moved.
   * source - Boolean indicating if the source or target terminal should be moved.
   */
  isTerminalPointMovable(cell: Cell, isSource: boolean) {
    return true
  }

  /**
   * Returns true if the given cell is bendable. This returns <cellsBendable>
   * for all given cells if <isLocked> does not return true for the given
   * cell and its style does not specify <constants.STYLE_BENDABLE> to be 0.
   *
   * Parameters:
   *
   * cell - <Cell> whose bendable state should be returned.
   */
  isCellBendable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isCellsBendable() &&
      !this.isCellLocked(cell) &&
      style[constants.STYLE_BENDABLE] !== '0'
  }

  /**
   * Returns <cellsBenadable>.
   */
  isCellsBendable() {
    return this.cellsBendable
  }

  /**
   * Specifies if the graph should allow bending of edges. This
   * implementation updates <bendable>.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph should allow bending of
   * edges.
   */
  setCellsBendable(value: boolean) {
    this.cellsBendable = value
  }

  /**
   * Returns true if the given cell is editable. This returns <cellsEditable> for
   * all given cells if <isCellLocked> does not return true for the given cell
   * and its style does not specify <constants.STYLE_EDITABLE> to be 0.
   *
   * Parameters:
   *
   * cell - <Cell> whose editable state should be returned.
   */
  isCellEditable(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isCellsEditable() &&
      !this.isCellLocked(cell) &&
      style[constants.STYLE_EDITABLE] !== '0'
  }

  /**
   * Returns <cellsEditable>.
   */
  isCellsEditable() {
    return this.cellsEditable
  }

  /**
   * Specifies if the graph should allow in-place editing for cell labels.
   * This implementation updates <cellsEditable>.
   *
   * Parameters:
   *
   * value - Boolean indicating if the graph should allow in-place
   * editing.
   */
  setCellsEditable(value: boolean) {
    this.cellsEditable = value
  }

  /**
   * Returns true if the given cell is disconnectable from the source or
   * target terminal. This returns <isCellsDisconnectable> for all given
   * cells if <isCellLocked> does not return true for the given cell.
   *
   * Parameters:
   *
   * cell - <Cell> whose disconnectable state should be returned.
   * terminal - <Cell> that represents the source or target terminal.
   * source - Boolean indicating if the source or target terminal is to be
   * disconnected.
   */
  isCellDisconnectable(cell: Cell, terminal: Cell, isSource: boolean) {
    return this.isCellsDisconnectable() && !this.isCellLocked(cell)
  }

  /**
   * Returns <cellsDisconnectable>.
   */
  isCellsDisconnectable() {
    return this.cellsDisconnectable
  }

  /**
   * Sets <cellsDisconnectable>.
   */
  setCellsDisconnectable(value: boolean) {
    this.cellsDisconnectable = value
  }

  /**
   * Returns true if the given cell is a valid source for new connections.
   * This implementation returns true for all non-null values and is
   * called by is called by <isValidConnection>.
   *
   * Parameters:
   *
   * cell - <Cell> that represents a possible source or null.
   */
  isValidSource(cell: Cell) {
    return (
      (cell == null && this.allowDanglingEdges) ||
      (
        cell != null && (
          !this.model.isEdge(cell) || this.connectableEdges) &&
        this.isCellConnectable(cell)
      )
    )
  }

  /**
   * Returns <isValidSource> for the given cell. This is called by
   * <isValidConnection>.
   *
   * Parameters:
   *
   * cell - <Cell> that represents a possible target or null.
   */
  isValidTarget(cell: Cell) {
    return this.isValidSource(cell)
  }

  /**
   * Returns true if the given target cell is a valid target for source.
   * This is a boolean implementation for not allowing connections between
   * certain pairs of vertices and is called by <getEdgeValidationError>.
   * This implementation returns true if <isValidSource> returns true for
   * the source and <isValidTarget> returns true for the target.
   *
   * Parameters:
   *
   * source - <Cell> that represents the source cell.
   * target - <Cell> that represents the target cell.
   */
  isValidConnection(source: Cell, target: Cell) {
    return this.isValidSource(source) && this.isValidTarget(target)
  }

  /**
   * Specifies if the graph should allow new connections. This implementation
   * updates <mxConnectionHandler.enabled> in <connectionHandler>.
   *
   * Parameters:
   *
   * connectable - Boolean indicating if new connections should be allowed.
   */
  setConnectable(connectable: boolean) {
    this.connectionHandler.setEnabled(connectable)
  }

  /**
   * Returns true if the <connectionHandler> is enabled.
   */
  isConnectable() {
    return this.connectionHandler.isEnabled()
  }

  /**
   * Specifies if tooltips should be enabled. This implementation updates
   * <mxTooltipHandler.enabled> in <tooltipHandler>.
   *
   * Parameters:
   *
   * enabled - Boolean indicating if tooltips should be enabled.
   */
  setTooltips(enabled: boolean) {
    this.tooltipHandler.setEnabled(enabled)
  }

  /**
   * Specifies if panning should be enabled. This implementation updates
   * <mxPanningHandler.panningEnabled> in <panningHandler>.
   *
   * Parameters:
   *
   * enabled - Boolean indicating if panning should be enabled.
   */
  setPanning(enabled: boolean) {
    this.panningHandler.panningEnabled = enabled
  }

  /**
   * Returns true if the given cell is currently being edited.
   * If no cell is specified then this returns true if any
   * cell is currently being edited.
   *
   * Parameters:
   *
   * cell - <Cell> that should be checked.
   */
  isEditing(cell?: Cell) {
    if (this.cellEditor != null) {
      const editingCell = this.cellEditor.getEditingCell()

      return (cell == null) ? editingCell != null : cell === editingCell
    }

    return false
  }

  /**
   * Returns true if the size of the given cell should automatically be
   * updated after a change of the label. This implementation returns
   * <autoSizeCells> or checks if the cell style does specify
   * <constants.STYLE_AUTOSIZE> to be 1.
   *
   * Parameters:
   *
   * cell - <Cell> that should be resized.
   */
  isAutoSizeCell(cell: Cell) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return this.isAutoSizeCells() || style[constants.STYLE_AUTOSIZE] === '1'
  }

  isAutoSizeCells() {
    return this.autoSizeCells
  }

  /**
   * Specifies if cell sizes should be automatically updated after a label
   * change. This implementation sets <autoSizeCells> to the given parameter.
   * To update the size of cells when the cells are added, set
   * <autoSizeCellsOnAdd> to true.
   *
   * Parameters:
   *
   * value - Boolean indicating if cells should be resized
   * automatically.
   */
  setAutoSizeCells(value: boolean) {
    this.autoSizeCells = value
  }

  /**
   * Returns true if the parent of the given cell should be extended if the
   * child has been resized so that it overlaps the parent. This
   * implementation returns <isExtendParents> if the cell is not an edge.
   *
   * Parameters:
   *
   * cell - <Cell> that has been resized.
   */
  isExtendParent(cell: Cell) {
    return !this.getModel().isEdge(cell) && this.isExtendParents()
  }

  isExtendParents() {
    return this.extendParents
  }

  setExtendParents(value: boolean) {
    this.extendParents = value
  }

  isExtendParentsOnAdd(cell: Cell) {
    return this.extendParentsOnAdd
  }

  setExtendParentsOnAdd(value: boolean) {
    this.extendParentsOnAdd = value
  }

  isExtendParentsOnMove() {
    return this.extendParentsOnMove
  }

  setExtendParentsOnMove(value: boolean) {
    this.extendParentsOnMove = value
  }

  isRecursiveResize() {
    return this.recursiveResize
  }

  setRecursiveResize(value: boolean) {
    this.recursiveResize = value
  }

  /**
   * Returns true if the given cell should be kept inside the bounds of its
   * parent according to the rules defined by <getOverlap> and
   * <isAllowOverlapParent>. This implementation returns false for all children
   * of edges and <isConstrainChildren> otherwise.
   *
   * Parameters:
   *
   * cell - <Cell> that should be constrained.
   */
  isConstrainChild(cell: Cell) {
    return this.isConstrainChildren() &&
      !this.getModel().isEdge(this.getModel().getParent(cell)!)
  }

  isConstrainChildren() {
    return this.constrainChildren
  }

  setConstrainChildren(value: boolean) {
    this.constrainChildren = value
  }

  isConstrainRelativeChildren() {
    return this.constrainRelativeChildren
  }

  setConstrainRelativeChildren(value: boolean) {
    this.constrainRelativeChildren = value
  }

  isAllowNegativeCoordinates() {
    return this.allowNegativeCoordinates
  }

  setAllowNegativeCoordinates(value: boolean) {
    this.allowNegativeCoordinates = value
  }

  /**
   * Returns a decimal number representing the amount of the width and height
   * of the given cell that is allowed to overlap its parent. A value of 0
   * means all children must stay inside the parent, 1 means the child is
   * allowed to be placed outside of the parent such that it touches one of
   * the parents sides. If <isAllowOverlapParent> returns false for the given
   * cell, then this method returns 0.
   *
   * Parameters:
   *
   * cell - <Cell> for which the overlap ratio should be returned.
   */
  getOverlap(cell: Cell) {
    return (this.isAllowOverlapParent(cell)) ? this.defaultOverlap : 0
  }

  /**
   * Returns true if the given cell is allowed to be placed outside of the
   * parents area.
   *
   * Parameters:
   *
   * cell - <Cell> that represents the child to be checked.
   */
  isAllowOverlapParent(cell: Cell) {
    return false
  }

  /**
   * Returns the cells which are movable in the given array of cells.
   */
  getFoldableCells(cells: Cell[], collapse: boolean) {
    return this.model.filterCells(cells, cell => this.isCellFoldable(cell, collapse))
  }

  /**
   * Returns true if the given cell is foldable. This implementation
   * returns true if the cell has at least one child and its style
   * does not specify <constants.STYLE_FOLDABLE> to be 0.
   */
  isCellFoldable(cell: Cell, nextCollapseState: boolean) {
    const state = this.view.getState(cell)
    const style = (state != null) ? state.style : this.getCellStyle(cell)

    return (
      this.model.getChildCount(cell) > 0 &&
      util.getBooleanFromStyle(style, StyleName.foldable)
    )
  }

  /**
   * Returns true if the given cell is a valid drop target for the specified
   * cells. If <splitEnabled> is true then this returns <isSplitTarget> for
   * the given arguments else it returns true if the cell is not collapsed
   * and its child count is greater than 0.
   *
   * Parameters:
   *
   * cell - <Cell> that represents the possible drop target.
   * cells - <Cells> that should be dropped into the target.
   * evt - Mouseevent that triggered the invocation.
   */
  isValidDropTarget(cell: Cell, cells: Cell[], e: MouseEvent) {
    return cell != null && ((this.isSplitEnabled() &&
      this.isSplitTarget(cell, cells, e)) || (!this.model.isEdge(cell) &&
        (this.isSwimlane(cell) || (this.model.getChildCount(cell) > 0 &&
          !this.isCellCollapsed(cell)))))
  }

  /**
   * Returns true if the given edge may be splitted into two edges with the
   * given cell as a new terminal between the two.
   *
   * Parameters:
   *
   * target - <Cell> that represents the edge to be splitted.
   * cells - <Cells> that should split the edge.
   * evt - Mouseevent that triggered the invocation.
   */
  isSplitTarget(target: Cell, cells: Cell[], e: MouseEvent) {
    if (
      this.model.isEdge(target) &&
      cells != null &&
      cells.length === 1 &&
      this.isCellConnectable(cells[0]) &&
      this.getEdgeValidationError(target, this.model.getTerminal(target, true)!, cells[0]) == null
    ) {
      const src = this.model.getTerminal(target, true)!
      const trg = this.model.getTerminal(target, false)!

      return (
        !this.model.isAncestor(cells[0], src) &&
        !this.model.isAncestor(cells[0], trg)
      )
    }

    return false
  }

  /**
   * Returns the given cell if it is a drop target for the given cells or the
   * nearest ancestor that may be used as a drop target for the given cells.
   * If the given array contains a swimlane and <swimlaneNesting> is false
   * then this always returns null. If no cell is given, then the bottommost
   * swimlane at the location of the given event is returned.
   *
   * This function should only be used if <isDropEnabled> returns true.
   *
   * Parameters:
   *
   * cells - Array of <Cells> which are to be dropped onto the target.
   * evt - Mouseevent for the drag and drop.
   * cell - <Cell> that is under the mousepointer.
   * clone - Optional boolean to indicate of cells will be cloned.
   */
  getDropTarget(cells: Cell[], evt: MouseEvent, cell: Cell, clone: boolean) {
    if (!this.isSwimlaneNesting()) {
      for (let i = 0; i < cells.length; i += 1) {
        if (this.isSwimlane(cells[i])) {
          return null
        }
      }
    }

    const pt = util.convertPoint(this.container, DomEvent.getClientX(evt), DomEvent.getClientY(evt))
    pt.x -= this.panDx
    pt.y -= this.panDy
    const swimlane = this.getSwimlaneAt(pt.x, pt.y)

    if (cell == null) {
      // tslint:disable-next-line
      cell = swimlane!
    } else if (swimlane != null) {
      // Checks if the cell is an ancestor of the swimlane
      // under the mouse and uses the swimlane in that case
      let tmp = this.model.getParent(swimlane)

      while (tmp != null && this.isSwimlane(tmp) && tmp !== cell) {
        tmp = this.model.getParent(tmp)
      }

      if (tmp === cell) {
        // tslint:disable-next-line
        cell = swimlane
      }
    }

    while (
      cell != null &&
      !this.isValidDropTarget(cell, cells, evt) &&
      !this.model.isLayer(cell)) {
      // tslint:disable-next-line
      cell = this.model.getParent(cell)!
    }

    // Checks if parent is dropped into child if not cloning
    if (clone == null || !clone) {
      let parent = cell

      while (parent != null && util.indexOf(cells, parent) < 0) {
        parent = this.model.getParent(parent)!
      }
    }

    return (!this.model.isLayer(cell) && parent == null) ? cell : null
  }

  // #endregion

  // #region ======== Cell retrieval

  getDefaultParent(): Cell {
    let parent = this.getCurrentRoot()

    if (parent == null) {
      parent = this.defaultParent

      if (parent == null) {
        const root = this.model.getRoot()
        parent = this.model.getChildAt(root, 0)
      }
    }

    return parent!
  }

  /**
   * Sets the <defaultParent> to the given cell. Set this to null to return
   * the first child of the root in getDefaultParent.
   */
  setDefaultParent(cell: Cell | null) {
    this.defaultParent = cell
  }

  /**
   * Returns the nearest ancestor of the given cell which is a swimlane, or
   * the given cell, if it is itself a swimlane.
   *
   * Parameters:
   *
   * cell - <Cell> for which the ancestor swimlane should be returned.
   */
  getSwimlane(cell: Cell) {
    while (cell != null && !this.isSwimlane(cell)) {
      // tslint:disable-next-line
      cell = this.model.getParent(cell)!
    }

    return cell
  }

  /**
   * Returns the bottom-most swimlane that intersects the given point (x, y)
   * in the cell hierarchy that starts at the given parent.
   *
   * Parameters:
   *
   * x - X-coordinate of the location to be checked.
   * y - Y-coordinate of the location to be checked.
   * parent - <Cell> that should be used as the root of the recursion.
   * Default is <defaultParent>.
   */
  getSwimlaneAt(
    x: number,
    y: number,
    parent: Cell = this.getDefaultParent()!,
  ): Cell | null {
    if (parent != null) {
      const childCount = this.model.getChildCount(parent)
      for (let i = 0; i < childCount; i += 1) {
        const child = this.model.getChildAt(parent, i)!
        const result = this.getSwimlaneAt(x, y, child)!

        if (result != null) {
          return result
        }

        if (this.isSwimlane(child)) {
          const state = this.view.getState(child)

          if (this.intersects(state!, x, y)) {
            return child
          }
        }
      }
    }

    return null
  }

  /**
   * Returns the bottom-most cell that intersects the given point (x, y) in
   * the cell hierarchy starting at the given parent. This will also return
   * swimlanes if the given location intersects the content area of the
   * swimlane. If this is not desired, then the <hitsSwimlaneContent> may be
   * used if the returned cell is a swimlane to determine if the location
   * is inside the content area or on the actual title of the swimlane.
   *
   * Parameters:
   *
   * x - X-coordinate of the location to be checked.
   * y - Y-coordinate of the location to be checked.
   * parent - <Cell> that should be used as the root of the recursion.
   * Default is current root of the view or the root of the model.
   * vertices - Optional boolean indicating if vertices should be returned.
   * Default is true.
   * edges - Optional boolean indicating if edges should be returned. Default
   * is true.
   * ignoreFn - Optional function that returns true if cell should be ignored.
   * The function is passed the cell state and the x and y parameter.
   */
  getCellAt(
    x: number,
    y: number,
    parent?: Cell | null,
    vertices: boolean = true,
    edges: boolean = true,
    ignoreFn?: (state: CellState, x?: number, y?: number) => boolean,
  ): Cell | null {
    if (parent == null) {
      // tslint:disable-next-line
      parent = this.getCurrentRoot()

      if (parent == null) {
        // tslint:disable-next-line
        parent = this.getModel().getRoot()
      }
    }

    if (parent != null) {
      const childCount = this.model.getChildCount(parent)

      for (let i = childCount - 1; i >= 0; i -= 1) {
        const cell = this.model.getChildAt(parent, i)!
        const result = this.getCellAt(x, y, cell, vertices, edges, ignoreFn)!

        if (result != null) {
          return result
        }
        if (
          this.isCellVisible(cell) && (
            edges && this.model.isEdge(cell) ||
            vertices && this.model.isNode(cell)
          )
        ) {
          const state = this.view.getState(cell)

          if (state != null && (ignoreFn == null || !ignoreFn(state, x, y)) &&
            this.intersects(state, x, y)) {
            return cell
          }
        }
      }
    }

    return null
  }

  /**
   * Returns the bottom-most cell that intersects the given point (x, y) in
   * the cell hierarchy that starts at the given parent.
   *
   * Parameters:
   *
   * state - <CellState> that represents the cell state.
   * x - X-coordinate of the location to be checked.
   * y - Y-coordinate of the location to be checked.
   */
  intersects(state: CellState, x: number, y: number) {
    if (state != null) {
      const pts = state.absolutePoints

      if (pts != null) {
        const t2 = this.tolerance * this.tolerance
        let pt = pts[0]!

        for (let i = 1; i < pts.length; i += 1) {
          const next = pts[i]!
          const dist = util.ptSegmentDist(pt.x, pt.y, next.x, next.y, x, y)

          if (dist <= t2) {
            return true
          }

          pt = next
        }
      } else {
        const alpha = util.toRadians(util.getValue(state.style, constants.STYLE_ROTATION) || 0)
        if (alpha !== 0) {
          const cos = Math.cos(-alpha)
          const sin = Math.sin(-alpha)
          const cx = state.bounds.getCorner()
          const pt = util.rotatePoint(new Point(x, y), cos, sin, cx)
          x = pt.x // tslint:disable-line
          y = pt.y // tslint:disable-line
        }

        if (util.contains(state.bounds, x, y)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Returns true if the given coordinate pair is inside the content
   * are of the given swimlane.
   *
   * Parameters:
   *
   * swimlane - <Cell> that specifies the swimlane.
   * x - X-coordinate of the mouse event.
   * y - Y-coordinate of the mouse event.
   */
  hitsSwimlaneContent(swimlane: Cell, x: number, y: number) {
    const state = this.getView().getState(swimlane)
    const size = this.getStartSize(swimlane)

    if (state != null) {
      const scale = this.getView().getScale()
      x -= state.bounds.x // tslint:disable-line
      y -= state.bounds.y // tslint:disable-line

      if (size.width > 0 && x > 0 && x > size.width * scale) {
        return true
      }
      if (size.height > 0 && y > 0 && y > size.height * scale) {
        return true
      }
    }

    return false
  }

  /**
   * Returns the visible child vertices of the given parent.
   *
   * Parameters:
   *
   * parent - <Cell> whose children should be returned.
   */
  getChildVertices(parent: Cell) {
    return this.getChildCells(parent, true, false)
  }

  /**
   * Returns the visible child edges of the given parent.
   *
   * Parameters:
   *
   * parent - <Cell> whose child vertices should be returned.
   */
  getChildEdges(parent: Cell) {
    return this.getChildCells(parent, false, true)
  }

  /**
   * Returns the visible child vertices or edges in the given parent. If
   * vertices and edges is false, then all children are returned.
   *
   * Parameters:
   *
   * parent - <Cell> whose children should be returned.
   * vertices - Optional boolean that specifies if child vertices should
   * be returned. Default is false.
   * edges - Optional boolean that specifies if child edges should
   * be returned. Default is false.
   */
  getChildCells(
    parent: Cell = this.getDefaultParent()!,
    includeNodes: boolean = false,
    includeEdges: boolean = false,
  ) {
    const cells = this.model.getChildCells(parent, includeNodes, includeEdges)
    const result = []

    // Filters out the non-visible child cells
    for (let i = 0; i < cells.length; i += 1) {
      if (this.isCellVisible(cells[i])) {
        result.push(cells[i])
      }
    }

    return result
  }

  /**
   * Returns all visible edges connected to the given cell without loops.
   *
   * Parameters:
   *
   * cell - <Cell> whose connections should be returned.
   * parent - Optional parent of the opposite end for a connection to be
   * returned.
   */
  getConnections(cell: Cell, parent?: Cell | null) {
    return this.getEdges(cell, parent, true, true, false)
  }

  /**
   * Returns the visible incoming edges for the given cell. If the optional
   * parent argument is specified, then only child edges of the given parent
   * are returned.
   *
   * Parameters:
   *
   * cell - <Cell> whose incoming edges should be returned.
   * parent - Optional parent of the opposite end for an edge to be
   * returned.
   */
  getIncomingEdges(cell: Cell, parent?: Cell | null) {
    return this.getEdges(cell, parent, true, false, false)
  }

  /**
   * Returns the visible outgoing edges for the given cell. If the optional
   * parent argument is specified, then only child edges of the given parent
   * are returned.
   *
   * Parameters:
   *
   * cell - <Cell> whose outgoing edges should be returned.
   * parent - Optional parent of the opposite end for an edge to be
   * returned.
   */
  getOutgoingEdges(cell: Cell, parent?: Cell | null) {
    return this.getEdges(cell, parent, false, true, false)
  }

  /**
   * Returns the incoming and/or outgoing edges for the given cell.
   * If the optional parent argument is specified, then only edges are returned
   * where the opposite is in the given parent cell. If at least one of incoming
   * or outgoing is true, then loops are ignored, if both are false, then all
   * edges connected to the given cell are returned including loops.
   *
   * Parameters:
   *
   * cell - <Cell> whose edges should be returned.
   * parent - Optional parent of the opposite end for an edge to be
   * returned.
   * incoming - Optional boolean that specifies if incoming edges should
   * be included in the result. Default is true.
   * outgoing - Optional boolean that specifies if outgoing edges should
   * be included in the result. Default is true.
   * includeLoops - Optional boolean that specifies if loops should be
   * included in the result. Default is true.
   * recurse - Optional boolean the specifies if the parent specified only
   * need be an ancestral parent, true, or the direct parent, false.
   * Default is false
   */
  getEdges(
    cell: Cell,
    parent?: Cell | null,
    incoming: boolean = true,
    outgoing: boolean = true,
    includeLoops: boolean = true,
    recurse: boolean = false,
  ) {
    let edges: Cell[] = []

    const isCollapsed = this.isCellCollapsed(cell)
    const childCount = this.model.getChildCount(cell)

    for (let i = 0; i < childCount; i += 1) {
      const child = this.model.getChildAt(cell, i)!
      if (isCollapsed || !this.isCellVisible(child)) {
        edges = edges.concat(this.model.getEdges(child, incoming, outgoing))
      }
    }

    edges = edges.concat(this.model.getEdges(cell, incoming, outgoing))
    const result = []

    for (let i = 0; i < edges.length; i += 1) {
      const state = this.view.getState(edges[i])

      const source = (state != null)
        ? state.getVisibleTerminal(true)
        : this.view.getVisibleTerminal(edges[i], true)
      const target = (state != null)
        ? state.getVisibleTerminal(false)
        : this.view.getVisibleTerminal(edges[i], false)

      if (
        (includeLoops && source === target) ||
        (
          (source !== target) &&
          (
            (
              incoming &&
              target === cell &&
              (parent == null || this.isValidAncestor(source!, parent, recurse))) ||
            (
              outgoing &&
              source === cell &&
              (parent == null || this.isValidAncestor(target!, parent, recurse))
            )
          )
        )
      ) {
        result.push(edges[i])
      }
    }

    return result
  }

  /**
   * Returns whether or not the specified parent is a valid
   * ancestor of the specified cell, either direct or indirectly
   * based on whether ancestor recursion is enabled.
   *
   * Parameters:
   *
   * cell - <Cell> the possible child cell
   * parent - <Cell> the possible parent cell
   * recurse - boolean whether or not to recurse the child ancestors
   */
  isValidAncestor(cell: Cell, parent: Cell, recurse?: boolean) {
    return (recurse ? this.model.isAncestor(parent, cell) : this.model
      .getParent(cell) === parent)
  }

  /**
   * Returns all distinct visible opposite cells for the specified terminal
   * on the given edges.
   *
   * Parameters:
   *
   * edges - Array of <Cells> that contains the edges whose opposite
   * terminals should be returned.
   * terminal - Terminal that specifies the end whose opposite should be
   * returned.
   * source - Optional boolean that specifies if source terminals should be
   * included in the result. Default is true.
   * targets - Optional boolean that specifies if targer terminals should be
   * included in the result. Default is true.
   */
  getOpposites(
    edges: Cell[],
    terminal: Cell,
    includeSources: boolean = true,
    includeTargets: boolean = true,
  ) {
    const terminals = []

    // Fast lookup to avoid duplicates in terminals array
    const dict = new WeakMap<Cell, boolean>()

    if (edges != null) {
      for (let i = 0; i < edges.length; i += 1) {
        const state = this.view.getState(edges[i])

        const source = (state != null)
          ? state.getVisibleTerminal(true)
          : this.view.getVisibleTerminal(edges[i], true)

        const target = (state != null)
          ? state.getVisibleTerminal(false)
          : this.view.getVisibleTerminal(edges[i], false)

        // Checks if the terminal is the source of the edge and if the
        // target should be stored in the result
        if (
          source === terminal &&
          target != null &&
          target !== terminal &&
          includeTargets
        ) {
          if (!dict.get(target)) {
            dict.set(target, true)
            terminals.push(target)
          }
        } else if (
          target === terminal &&
          source != null &&
          source !== terminal &&
          includeSources
        ) {
          // Checks if the terminal is the taget of the edge and if the
          // source should be stored in the result

          if (!dict.get(source)) {
            dict.set(source, true)
            terminals.push(source)
          }
        }
      }
    }

    return terminals
  }

  /**
   * Returns the edges between the given source and target. This takes into
   * account collapsed and invisible cells and returns the connected edges
   * as displayed on the screen.
   */
  getEdgesBetween(source: Cell, target: Cell, directed: boolean = false) {
    const edges = this.getEdges(source)
    const result = []

    // Checks if the edge is connected to the correct
    // cell and returns the first match
    for (let i = 0; i < edges.length; i += 1) {
      const state = this.view.getState(edges[i])

      const src = (state != null)
        ? state.getVisibleTerminal(true)
        : this.view.getVisibleTerminal(edges[i], true)

      const trg = (state != null)
        ? state.getVisibleTerminal(false)
        : this.view.getVisibleTerminal(edges[i], false)

      if (
        (src === source && trg === target) ||
        (!directed && src === target && trg === source)
      ) {
        result.push(edges[i])
      }
    }

    return result
  }

  /**
   * Returns an <Point> representing the given event in the unscaled,
   * non-translated coordinate space of <container> and applies the grid.
   *
   * Parameters:
   *
   * evt - Mousevent that contains the mouse pointer location.
   * addOffset - Optional boolean that specifies if the position should be
   * offset by half of the <gridSize>. Default is true.
   */
  getPointForEvent(e: MouseEvent, addOffset: boolean = true) {
    const p = util.convertPoint(this.container, DomEvent.getClientX(e), DomEvent.getClientY(e))

    const s = this.view.scale
    const tr = this.view.translate
    const off = addOffset ? this.gridSize / 2 : 0

    p.x = this.snap(p.x / s - tr.x - off)
    p.y = this.snap(p.y / s - tr.y - off)

    return p
  }

  /**
   * Returns the child vertices and edges of the given parent that are contained
   * in the given rectangle. The result is added to the optional result array,
   * which is returned. If no result array is specified then a new array is
   * created and returned.
   *
   * Parameters:
   *
   * x - X-coordinate of the rectangle.
   * y - Y-coordinate of the rectangle.
   * width - Width of the rectangle.
   * height - Height of the rectangle.
   * parent - <Cell> that should be used as the root of the recursion.
   * Default is current root of the view or the root of the model.
   * result - Optional array to store the result in.
   */
  getCells(
    x: number,
    y: number,
    width: number,
    height: number,
    parent?: Cell,
    result: Cell[] = [],
  ) {
    if (width > 0 || height > 0) {
      const model = this.getModel()
      const right = x + width
      const bottom = y + height

      if (parent == null) {
        parent = this.getCurrentRoot()! // tslint:disable-line
        if (parent == null) {
          parent = model.getRoot()! // tslint:disable-line
        }
      }

      if (parent != null) {
        const childCount = model.getChildCount(parent)
        for (let i = 0; i < childCount; i += 1) {
          const cell = model.getChildAt(parent, i)!
          const state = this.view.getState(cell)

          if (state != null && this.isCellVisible(cell)) {
            const deg = util.getNumber(state.style, constants.STYLE_ROTATION, 0)
            let box = state.bounds
            if (deg !== 0) {
              box = util.getBoundingBox(box, deg)
            }

            if ((model.isEdge(cell) || model.isNode(cell)) &&
              box.x >= x && box.y + box.height <= bottom &&
              box.y >= y && box.x + box.width <= right) {
              result.push(cell)
            } else {
              this.getCells(x, y, width, height, cell, result)
            }
          }
        }
      }
    }

    return result
  }

  /**
   * Returns the children of the given parent that are contained in the
   * halfpane from the given point (x0, y0) rightwards or downwards
   * depending on rightHalfpane and bottomHalfpane.
   *
   * Parameters:
   *
   * x0 - X-coordinate of the origin.
   * y0 - Y-coordinate of the origin.
   * parent - Optional <Cell> whose children should be checked. Default is
   * <defaultParent>.
   * rightHalfpane - Boolean indicating if the cells in the right halfpane
   * from the origin should be returned.
   * bottomHalfpane - Boolean indicating if the cells in the bottom halfpane
   * from the origin should be returned.
   */
  getCellsBeyond(
    x0: number,
    y0: number,
    parent: Cell,
    rightHalfpane: boolean,
    bottomHalfpane: boolean,
  ) {
    const result = []

    if (rightHalfpane || bottomHalfpane) {
      if (parent == null) {
        parent = this.getDefaultParent()! // tslint:disable-line
      }

      if (parent != null) {
        const childCount = this.model.getChildCount(parent)

        for (let i = 0; i < childCount; i += 1) {
          const child = this.model.getChildAt(parent, i)!
          const state = this.view.getState(child)

          if (this.isCellVisible(child) && state != null) {
            if ((!rightHalfpane || state.bounds.x >= x0) &&
              (!bottomHalfpane || state.bounds.y >= y0)) {
              result.push(child)
            }
          }
        }
      }
    }

    return result
  }

  /**
   * Returns all children in the given parent which do not have incoming
   * edges. If the result is empty then the with the greatest difference
   * between incoming and outgoing edges is returned.
   *
   * Parameters:
   *
   * parent - <Cell> whose children should be checked.
   * isolate - Optional boolean that specifies if edges should be ignored if
   * the opposite end is not a child of the given parent cell. Default is
   * false.
   * invert - Optional boolean that specifies if outgoing or incoming edges
   * should be counted for a tree root. If false then outgoing edges will be
   * counted. Default is false.
   */
  findTreeRoots(parent: Cell, isolate: boolean = false, invert: boolean = false) {
    const roots = []

    if (parent != null) {
      const model = this.getModel()
      const childCount = model.getChildCount(parent)
      let best = null
      let maxDiff = 0

      for (let i = 0; i < childCount; i += 1) {
        const cell = model.getChildAt(parent, i)!

        if (this.model.isNode(cell) && this.isCellVisible(cell)) {
          const conns = this.getConnections(cell, isolate ? parent : null)
          let fanOut = 0
          let fanIn = 0

          for (let j = 0; j < conns.length; j += 1) {
            const src = this.view.getVisibleTerminal(conns[j], true)

            if (src === cell) {
              fanOut += 1
            } else {
              fanIn += 1
            }
          }

          if ((invert && fanOut === 0 && fanIn > 0) ||
            (!invert && fanIn === 0 && fanOut > 0)) {
            roots.push(cell)
          }

          const diff = (invert) ? fanIn - fanOut : fanOut - fanIn

          if (diff > maxDiff) {
            maxDiff = diff
            best = cell
          }
        }
      }

      if (roots.length === 0 && best != null) {
        roots.push(best)
      }
    }

    return roots
  }

  /**
   * Traverses the (directed) graph invoking the given function for each
   * visited vertex and edge. The function is invoked with the current vertex
   * and the incoming edge as a parameter. This implementation makes sure
   * each vertex is only visited once. The function may return false if the
   * traversal should stop at the given vertex.
   *
   * Example:
   *
   * (code)
   * mxLog.show();
   * var cell = graph.getSelectionCell();
   * graph.traverse(cell, false, function(vertex, edge)
   * {
   *   mxLog.debug(graph.getLabel(vertex));
   * });
   * (end)
   *
   * Parameters:
   *
   * vertex - <Cell> that represents the vertex where the traversal starts.
   * directed - Optional boolean indicating if edges should only be traversed
   * from source to target. Default is true.
   * func - Visitor function that takes the current vertex and the incoming
   * edge as arguments. The traversal stops if the function returns false.
   * edge - Optional <Cell> that represents the incoming edge. This is
   * null for the first step of the traversal.
   * visited - Optional <mxDictionary> from cells to true for the visited cells.
   * inverse - Optional boolean to traverse in inverse direction. Default is false.
   * This is ignored if directed is false.
   */
  traverse(
    node: Cell,
    directed: boolean = true,
    func: (node: Cell, edge: Cell) => boolean,
    edge: Cell,
    visited: WeakMap<Cell, boolean> = new WeakMap<Cell, boolean>(),
    inverse: boolean = false,
  ) {
    if (func != null && node != null) {
      if (!visited.get(node)) {
        visited.set(node, true)
        const result = func(node, edge)

        if (result == null || result) {
          const edgeCount = this.model.getEdgeCount(node)

          if (edgeCount > 0) {
            for (let i = 0; i < edgeCount; i += 1) {
              const e = this.model.getEdgeAt(node, i)!
              const isSource = this.model.getTerminal(e, true) === node

              if (!directed || (!inverse === isSource)) {
                const next = this.model.getTerminal(e, !isSource)!
                this.traverse(next, directed, func, e, visited, inverse)
              }
            }
          }
        }
      }
    }
  }

  // #endregion

  // #region ======== Selection

  /**
   * Removes selection cells that are not in the model from the selection.
   */
  updateSelection() {
    const cells = this.getSelectionCells()
    const removed: Cell[] = []

    cells.forEach((cell) => {
      if (!this.model.contains(cell) || !this.isCellVisible(cell)) {
        removed.push(cell)
      } else {
        let parent = this.model.getParent(cell)

        while (parent != null && parent !== this.view.currentRoot) {
          if (this.isCellCollapsed(parent) || !this.isCellVisible(parent)) {
            removed.push(cell)
            break
          }
          parent = this.model.getParent(parent)
        }
      }
    })

    this.removeSelectionCells(removed)
  }

  /**
   * Returns true if the given cell is selected.
   *
   * Parameters:
   *
   * cell - <Cell> for which the selection state should be returned.
   */
  isCellSelected(cell: Cell) {
    return this.selectionModel.isSelected(cell)
  }

  /**
   * Returns true if the selection is empty.
   */
  isSelectionEmpty() {
    return this.selectionModel.isEmpty()
  }

  /**
   * Clears the selection using <mxGraphSelectionModel.clear>.
   */
  clearSelection() {
    return this.selectionModel.clear()
  }

  /**
   * Returns the number of selected cells.
   */
  getSelectionCount() {
    return this.selectionModel.cells.length
  }

  /**
   * Returns the first cell from the array of selected <Cells>.
   */
  getSelectionCell() {
    return this.selectionModel.cells[0]
  }

  /**
   * Returns the array of selected <Cells>.
   */
  getSelectionCells() {
    return this.selectionModel.cells.slice()
  }

  /**
   * Sets the selection cell.
   *
   * Parameters:
   *
   * cell - <Cell> to be selected.
   */
  setSelectionCell(cell: Cell) {
    this.selectionModel.setCell(cell)
  }

  /**
   * Sets the selection cell.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be selected.
   */
  setSelectionCells(cells: Cell[]) {
    this.selectionModel.setCells(cells)
  }

  /**
   * Adds the given cell to the selection.
   *
   * Parameters:
   *
   * cell - <Cell> to be add to the selection.
   */
  addSelectionCell(cell: Cell) {
    this.selectionModel.addCell(cell)
  }

  /**
   * Adds the given cells to the selection.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be added to the selection.
   */
  addSelectionCells(cells: Cell[]) {
    this.selectionModel.addCells(cells)
  }

  /**
   * Removes the given cell from the selection.
   *
   * Parameters:
   *
   * cell - <Cell> to be removed from the selection.
   */
  removeSelectionCell(cell: Cell) {
    this.selectionModel.removeCell(cell)
  }

  /**
   * Removes the given cells from the selection.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be removed from the selection.
   */
  removeSelectionCells(cells: Cell[]) {
    this.selectionModel.removeCells(cells)
  }

  /**
   * Selects and returns the cells inside the given rectangle for the
   * specified event.
   *
   * Parameters:
   *
   * rect - <Rect> that represents the region to be selected.
   * evt - Mouseevent that triggered the selection.
   */
  selectRegion(rect: Rectangle, e: MouseEvent) {
    const cells = this.getCells(rect.x, rect.y, rect.width, rect.height)
    this.selectCellsForEvent(cells, e)

    return cells
  }

  /**
   * Selects the next cell.
   */
  selectNextCell() {
    this.selectCell(true)
  }

  /**
   * Selects the previous cell.
   */
  selectPreviousCell() {
    this.selectCell()
  }

  /**
   * Selects the parent cell.
   */
  selectParentCell() {
    this.selectCell(false, true)
  }

  /**
   * Selects the first child cell.
   */
  selectChildCell() {
    this.selectCell(false, false, true)
  }

  /**
   * Selects the next, parent, first child or previous cell, if all arguments
   * are false.
   *
   * Parameters:
   *
   * isNext - Boolean indicating if the next cell should be selected.
   * isParent - Boolean indicating if the parent cell should be selected.
   * isChild - Boolean indicating if the first child cell should be selected.
   */
  selectCell(
    isNext?: boolean,
    isParent?: boolean,
    isChild?: boolean,
  ) {
    const sel = this.selectionModel
    const cell = (sel.cells.length > 0) ? sel.cells[0] : null

    if (sel.cells.length > 1) {
      sel.clear()
    }

    const parent = (cell != null) ?
      this.model.getParent(cell)! :
      this.getDefaultParent()!

    const childCount = this.model.getChildCount(parent)

    if (cell == null && childCount > 0) {
      const child = this.model.getChildAt(parent!, 0)!
      this.setSelectionCell(child)
    } else if ((cell == null || isParent) &&
      this.view.getState(parent) != null &&
      this.model.getGeometry(parent!) != null) {
      if (this.getCurrentRoot() !== parent) {
        this.setSelectionCell(parent!)
      }
    } else if (cell != null && isChild) {
      const tmp = this.model.getChildCount(cell)
      if (tmp > 0) {
        const child = this.model.getChildAt(cell, 0)!
        this.setSelectionCell(child)
      }
    } else if (childCount > 0) {
      let i = parent.getChildIndex(cell!)

      if (isNext) {
        i += 1
        const child = this.model.getChildAt(parent, i % childCount)!
        this.setSelectionCell(child)
      } else {
        i -= 1
        const index = (i < 0) ? childCount - 1 : i
        const child = this.model.getChildAt(parent, index)!
        this.setSelectionCell(child)
      }
    }
  }

  /**
   * Selects all children of the given parent cell or the children of the
   * default parent if no parent is specified. To select leaf vertices and/or
   * edges use <selectCells>.
   *
   * Parameters:
   *
   * parent - Optional <Cell> whose children should be selected.
   * Default is <defaultParent>.
   * descendants - Optional boolean specifying whether all descendants should be
   * selected. Default is false.
   */
  selectAll(
    parent: Cell = this.getDefaultParent()!,
    descendants?: boolean,
  ) {
    const cells = descendants
      ? this.model.filterDescendants(
        cell => (cell !== parent && this.view.getState(cell) != null),
        parent,
      )
      : this.model.getChildren(parent)

    if (cells != null) {
      this.setSelectionCells(cells)
    }
  }

  /**
   * Select all vertices inside the given parent or the default parent.
   */
  selectNodes(parent: Cell) {
    this.selectCells(true, false, parent)
  }

  /**
   * Select all vertices inside the given parent or the default parent.
   */
  selectEdges(parent: Cell) {
    this.selectCells(false, true, parent)
  }

  /**
   * Selects all vertices and/or edges depending on the given boolean
   * arguments recursively, starting at the given parent or the default
   * parent if no parent is specified. Use <selectAll> to select all cells.
   * For vertices, only cells with no children are selected.
   *
   * Parameters:
   *
   * vertices - Boolean indicating if vertices should be selected.
   * edges - Boolean indicating if edges should be selected.
   * parent - Optional <Cell> that acts as the root of the recursion.
   * Default is <defaultParent>.
   */
  selectCells(
    vertices: boolean,
    edges: boolean,
    parent: Cell = this.getDefaultParent()!,
  ) {
    const cells = this.model.filterDescendants(
      cell => (
        this.view.getState(cell) != null &&
        ((this.model.getChildCount(cell) === 0 && this.model.isNode(cell) && vertices
          && !this.model.isEdge(this.model.getParent(cell)!)) ||
          (this.model.isEdge(cell) && edges))
      ),
      parent,
    )

    if (cells != null) {
      this.setSelectionCells(cells)
    }
  }

  /**
   * Selects the given cell by either adding it to the selection or
   * replacing the selection depending on whether the given mouse event is a
   * toggle event.
   *
   * Parameters:
   *
   * cell - <Cell> to be selected.
   * evt - Optional mouseevent that triggered the selection.
   */
  selectCellForEvent(cell: Cell, e: MouseEvent) {
    const isSelected = this.isCellSelected(cell)

    if (this.isToggleEvent(e)) {
      if (isSelected) {
        this.removeSelectionCell(cell)
      } else {
        this.addSelectionCell(cell)
      }
    } else if (!isSelected || this.getSelectionCount() !== 1) {
      this.setSelectionCell(cell)
    }
  }

  /**
   * Selects the given cells by either adding them to the selection or
   * replacing the selection depending on whether the given mouse event is a
   * toggle event.
   *
   * Parameters:
   *
   * cells - Array of <Cells> to be selected.
   * evt - Optional mouseevent that triggered the selection.
   */
  selectCellsForEvent(cells: Cell[], e: MouseEvent) {
    if (this.isToggleEvent(e)) {
      this.addSelectionCells(cells)
    } else {
      this.setSelectionCells(cells)
    }
  }
  // #endregion

  // #region ======== Selection state

  /**
   * Creates a new handler for the given cell state. This implementation
   * returns a new <mxEdgeHandler> of the corresponding cell is an edge,
   * otherwise it returns an <mxVertexHandler>.
   *
   * Parameters:
   *
   * state - <CellState> whose handler should be created.
   */
  createHandler(state: CellState) {
    let result = null

    if (state != null) {
      if (this.model.isEdge(state.cell)) {
        const source = state.getVisibleTerminalState(true)
        const target = state.getVisibleTerminalState(false)
        const geo = this.getCellGeometry(state.cell)

        const edgeStyle = this.view.getEdgeFunction(
          state, geo != null ? geo.points : null, source!, target!,
        )
        result = this.createEdgeHandler(state, edgeStyle)
      } else {
        result = this.createVertexHandler(state)
      }
    }

    return result
  }

  /**
   * Hooks to create a new <mxVertexHandler> for the given <CellState>.
   *
   * Parameters:
   *
   * state - <CellState> to create the handler for.
   */
  createVertexHandler(state: CellState) {
    // return new VertexHandler(state)
  }

  /**
   * Hooks to create a new <mxEdgeHandler> for the given <CellState>.
   *
   * Parameters:
   *
   * state - <CellState> to create the handler for.
   */
  createEdgeHandler(state: CellState, edgeStyle: any) {
    let result = null

    if (
      edgeStyle === EdgeStyle.loop ||
      edgeStyle === EdgeStyle.elbowConnector ||
      edgeStyle === EdgeStyle.sideToSide ||
      edgeStyle === EdgeStyle.topToBottom) {
      result = this.createElbowEdgeHandler(state)
    } else if (
      edgeStyle === EdgeStyle.segmentConnector ||
      edgeStyle === EdgeStyle.orthConnector
    ) {
      result = this.createEdgeSegmentHandler(state)
    } else {
      // result = new EdgeHandler(state)
    }

    return result
  }

  /**
   * Hooks to create a new <mxEdgeSegmentHandler> for the given <CellState>.
   *
   * Parameters:
   *
   * state - <CellState> to create the handler for.
   */
  createEdgeSegmentHandler(state: CellState) {
    // return new EdgeSegmentHandler(state)
  }

  /**
   * Hooks to create a new <mxElbowEdgeHandler> for the given <CellState>.
   *
   * Parameters:
   *
   * state - <CellState> to create the handler for.
   */
  createElbowEdgeHandler(state: CellState) {
    // return new ElbowEdgeHandler(state)
  }

  // #endregion

  // #region ======== Graph events

  /**
   * Adds a listener to the graph event dispatch loop. The listener
   * must implement the mouseDown, mouseMove and mouseUp methods
   * as shown in the <mxMouseEvent> class.
   *
   * Parameters:
   *
   * listener - Listener to be added to the graph event listeners.
   */
  addMouseListener(listener: any) {
    if (this.mouseListeners == null) {
      this.mouseListeners = []
    }

    this.mouseListeners.push(listener)
  }

  /**
   * Removes the specified graph listener.
   *
   * Parameters:
   *
   * listener - Listener to be removed from the graph event listeners.
   */
  removeMouseListener(listener: any) {
    if (this.mouseListeners != null) {
      for (let i = 0; i < this.mouseListeners.length; i += 1) {
        if (this.mouseListeners[i] === listener) {
          this.mouseListeners.splice(i, 1)
          break
        }
      }
    }
  }

  /**
   * Sets the graphX and graphY properties if the given <mxMouseEvent> if
   * required and returned the event.
   *
   * Parameters:
   *
   * me - <mxMouseEvent> to be updated.
   * evtName - Name of the mouse event.
   */
  updateMouseEvent(e: CustomMouseEvent, name: string) {
    if (e.graphX == null || e.graphY == null) {
      const pt = util.convertPoint(this.container, e.getX(), e.getY())

      e.graphX = pt.x - this.panDx
      e.graphY = pt.y - this.panDy

      // Searches for rectangles using method if native hit detection is disabled on shape
      if (e.getCell() == null && this.isMouseDown && name === DomEvent.MOUSE_MOVE) {
        e.state = this.view.getState(
          this.getCellAt(pt.x, pt.y, null, false, false, (state: CellState) => {
            return (
              state.shape == null ||
              // TODO:
              // state.shape.paintBackground !== RectShape.prototype.paintBackground ||
              util.getBooleanFromStyle(state.style, constants.STYLE_POINTER_EVENTS, true) ||
              (state.shape.fill != null && state.shape.fill !== constants.NONE))
          }),
        )
      }
    }

    return e
  }

  /**
   * Returns the state for the given touch event.
   */
  getStateForTouchEvent(e: MouseEvent) {
    const x = DomEvent.getClientX(e)
    const y = DomEvent.getClientY(e)

    // Dispatches the drop event to the graph which
    // consumes and executes the source function
    const pt = util.convertPoint(this.container, x, y)

    return this.view.getState(this.getCellAt(pt.x, pt.y))
  }

  /**
   * Returns true if the event should be ignored in <fireMouseEvent>.
   */

  private lastEvent: MouseEvent
  private eventSource: HTMLElement | null
  private mouseMoveRedirect: null | ((e: MouseEvent) => void)
  private mouseUpRedirect: null | ((e: MouseEvent) => void)
  private ignoreMouseEvents: boolean

  private lastTouchCell: Cell | null
  private lastTouchEvent: MouseEvent
  private lastTouchX: number = 0
  private lastTouchY: number = 0
  private lastTouchTime: number = 0
  private fireDoubleClick: boolean
  private doubleClickCounter: number = 0
  private tapAndHoldThread: number = 0

  isEventIgnored(name: string, e: CustomMouseEvent, sender: any) {
    const mouseEvent = DomEvent.isMouseEvent(e.getEvent())
    let result = false

    // Drops events that are fired more than once
    if (e.getEvent() === this.lastEvent) {
      result = true
    } else {
      this.lastEvent = e.getEvent()
    }

    // Installs event listeners to capture the complete gesture from the event source
    // for non-MS touch events as a workaround for all events for the same geture being
    // fired from the event source even if that was removed from the DOM.
    if (this.eventSource != null && name !== DomEvent.MOUSE_MOVE) {
      DomEvent.removeGestureListeners(
        this.eventSource,
        null,
        this.mouseMoveRedirect,
        this.mouseUpRedirect,
      )
      this.mouseMoveRedirect = null
      this.mouseUpRedirect = null
      this.eventSource = null
    } else if (
      !detector.IS_CHROME &&
      this.eventSource != null &&
      e.getSource() !== this.eventSource
    ) {
      result = true
    } else if (
      detector.SUPPORT_TOUCH &&
      name === DomEvent.MOUSE_DOWN &&
      !mouseEvent &&
      !DomEvent.isPenEvent(e.getEvent())
    ) {
      this.eventSource = e.getSource()
      this.mouseMoveRedirect = (e: MouseEvent) => {
        this.fireMouseEvent(
          DomEvent.MOUSE_MOVE,
          new CustomMouseEvent(e, this.getStateForTouchEvent(e)),
        )
      }
      this.mouseUpRedirect = (e: MouseEvent) => {
        this.fireMouseEvent(
          DomEvent.MOUSE_UP,
          new CustomMouseEvent(e, this.getStateForTouchEvent(e)),
        )
      }

      DomEvent.addGestureListeners(
        this.eventSource,
        null,
        this.mouseMoveRedirect,
        this.mouseUpRedirect,
      )
    }

    // Factored out the workarounds for FF to make it easier to override/remove
    // Note this method has side-effects!
    if (this.isSyntheticEventIgnored(name, e, sender)) {
      result = true
    }

    // Never fires mouseUp/-Down for double clicks
    if (
      !DomEvent.isPopupTrigger(this.lastEvent) &&
      name !== DomEvent.MOUSE_MOVE &&
      this.lastEvent.detail === 2
    ) {
      return true
    }

    // Filters out of sequence events or mixed event types during a gesture
    if (name === DomEvent.MOUSE_UP && this.isMouseDown) {
      this.isMouseDown = false
    } else if (name === DomEvent.MOUSE_DOWN && !this.isMouseDown) {
      this.isMouseDown = true
      this.isMouseTrigger = mouseEvent
    } else if (
      !result && ((
        (!detector.IS_FIREFOX || name !== DomEvent.MOUSE_MOVE) &&
        this.isMouseDown && this.isMouseTrigger !== mouseEvent) ||
        (name === DomEvent.MOUSE_DOWN && this.isMouseDown) ||
        (name === DomEvent.MOUSE_UP && !this.isMouseDown))
    ) {
      // Drops mouse events that are fired during touch gestures as a workaround for Webkit
      // and mouse events that are not in sync with the current internal button state
      result = true
    }

    if (!result && name === DomEvent.MOUSE_DOWN) {
      this.lastMouseX = e.getX()
      this.lastMouseY = e.getY()
    }

    return result
  }

  /**
   * Hook for ignoring synthetic mouse events after touchend in Firefox.
   */
  isSyntheticEventIgnored(evtName: string, e: CustomMouseEvent, sender: any) {
    let result = false
    const mouseEvent = DomEvent.isMouseEvent(e.getEvent())

    // LATER: This does not cover all possible cases that can go wrong in FF
    if (this.ignoreMouseEvents && mouseEvent && evtName !== DomEvent.MOUSE_MOVE) {
      this.ignoreMouseEvents = evtName !== DomEvent.MOUSE_UP
      result = true
    } else if (detector.IS_FIREFOX && !mouseEvent && evtName === DomEvent.MOUSE_UP) {
      this.ignoreMouseEvents = true
    }

    return result
  }

  /**
   * Returns true if the event should be ignored in <fireMouseEvent>. This
   * implementation returns true for select, option and input (if not of type
   * checkbox, radio, button, submit or file) event sources if the event is not
   * a mouse event or a left mouse button press event.
   *
   * Parameters:
   *
   * evtName - The name of the event.
   * me - <mxMouseEvent> that should be ignored.
   */
  isEventSourceIgnored(evtName: string, e: CustomMouseEvent) {
    const source = e.getSource()
    const name = (source.nodeName != null) ? source.nodeName.toLowerCase() : ''
    const candidate = (
      !DomEvent.isMouseEvent(e.getEvent()) ||
      DomEvent.isLeftMouseButton(e.getEvent())
    )

    const inputType = (source as HTMLInputElement).type

    return (
      evtName === DomEvent.MOUSE_DOWN &&
      candidate &&
      (
        name === 'select' || name === 'option' ||
        (
          name === 'input' &&
          inputType !== 'checkbox' &&
          inputType !== 'radio' &&
          inputType !== 'button' &&
          inputType !== 'submit' &&
          inputType !== 'file'
        )
      )
    )
  }

  /**
   * Returns the <CellState> to be used when firing the mouse event for the
   * given state. This implementation returns the given state.
   *
   * Parameters:
   *
   * <CellState> - State whose event source should be returned.
   */
  getEventState(state: CellState) {
    return state
  }

  /**
   * Dispatches the given event in the graph event dispatch loop. Possible
   * event names are <DomEvent.MOUSE_DOWN>, <DomEvent.MOUSE_MOVE> and
   * <DomEvent.MOUSE_UP>. All listeners are invoked for all events regardless
   * of the consumed state of the event.
   *
   * Parameters:
   *
   * evtName - String that specifies the type of event to be dispatched.
   * e - <mxMouseEvent> to be fired.
   * sender - Optional sender argument. Default is this.
   */
  fireMouseEvent(name: string, e: CustomMouseEvent, sender?: any) {
    if (this.isEventSourceIgnored(name, e)) {
      if (this.tooltipHandler != null) {
        this.tooltipHandler.hide()
      }

      return
    }

    if (sender == null) {
      sender = this // tslint:disable-line
    }

    // Updates the graph coordinates in the event
    e = this.updateMouseEvent(e, name) // tslint:disable-line

    // Detects and processes double taps for touch-based devices which do
    // not have native double click events or where detection of double
    // click is not always possible (quirks, IE10+). Note that this can only
    // handle double clicks on cells because the sequence of events in IE
    // prevents detection on the background, it fires two mouse ups, one of
    // which without a cell but no mousedown for the second click which means
    // we cannot detect which mouseup(s) are part of the first click, ie we
    // do not know when the first click ends.
    if (
      (!this.nativeDblClickEnabled && !DomEvent.isPopupTrigger(e.getEvent())) ||
      (
        this.doubleTapEnabled &&
        detector.SUPPORT_TOUCH &&
        (DomEvent.isTouchEvent(e.getEvent()) || DomEvent.isPenEvent(e.getEvent())))
    ) {
      const currentTime = new Date().getTime()

      // NOTE: Second mouseDown for double click missing in quirks mode
      if (
        (!detector.IS_QUIRKS && name === DomEvent.MOUSE_DOWN) ||
        (detector.IS_QUIRKS && name === DomEvent.MOUSE_UP && !this.fireDoubleClick)
      ) {
        if (
          this.lastTouchEvent != null &&
          this.lastTouchEvent !== e.getEvent() &&
          currentTime - this.lastTouchTime < this.doubleTapTimeout &&
          Math.abs(this.lastTouchX - e.getX()) < this.doubleTapTolerance &&
          Math.abs(this.lastTouchY - e.getY()) < this.doubleTapTolerance &&
          this.doubleClickCounter < 2
        ) {
          this.doubleClickCounter += 1
          let doubleClickFired = false

          if (name === DomEvent.MOUSE_UP) {
            if (e.getCell() === this.lastTouchCell && this.lastTouchCell != null) {
              this.lastTouchTime = 0
              const cell = this.lastTouchCell
              this.lastTouchCell = null

              // Fires native dblclick event via event source
              // NOTE: This fires two double click events on edges in quirks mode. While
              // trying to fix this, we realized that nativeDoubleClick can be disabled for
              // quirks and IE10+ (or we didn't find the case mentioned above where it
              // would not work), ie. all double clicks seem to be working without this.
              if (detector.IS_QUIRKS) {
                // e.getSource().fireEvent('ondblclick')
              }

              this.dblClick(e.getEvent(), cell)
              doubleClickFired = true
            }
          } else {
            this.fireDoubleClick = true
            this.lastTouchTime = 0
          }

          // Do not ignore mouse up in quirks in this case
          if (!detector.IS_QUIRKS || doubleClickFired) {
            DomEvent.consume(e.getEvent())
            return
          }
        } else if (this.lastTouchEvent == null || this.lastTouchEvent !== e.getEvent()) {
          this.lastTouchCell = e.getCell()
          this.lastTouchX = e.getX()
          this.lastTouchY = e.getY()
          this.lastTouchTime = currentTime
          this.lastTouchEvent = e.getEvent()
          this.doubleClickCounter = 0
        }
      } else if ((this.isMouseDown || name === DomEvent.MOUSE_UP) && this.fireDoubleClick) {
        this.fireDoubleClick = false
        const cell = this.lastTouchCell
        this.lastTouchCell = null
        this.isMouseDown = false

        // Workaround for Chrome/Safari not firing native double click
        // events for double touch on background
        const valid = (cell != null) ||
          (
            (DomEvent.isTouchEvent(e.getEvent()) || DomEvent.isPenEvent(e.getEvent())) &&
            (detector.IS_CHROME || detector.IS_SAFARI)
          )

        if (
          valid &&
          Math.abs(this.lastTouchX - e.getX()) < this.doubleTapTolerance &&
          Math.abs(this.lastTouchY - e.getY()) < this.doubleTapTolerance
        ) {
          this.dblClick(e.getEvent(), cell)
        } else {
          DomEvent.consume(e.getEvent())
        }

        return
      }
    }

    if (!this.isEventIgnored(name, e, sender)) {
      // Updates the event state via getEventState
      e.state = this.getEventState(e.getState()!)
      // this.fireEvent(
      //   new DomEventObject(DomEvent.FIRE_MOUSE_EVENT, 'eventName', name, 'event', e)
      //   )

      if (
        detector.IS_OPERA || detector.IS_SAFARI || detector.IS_CHROME || detector.IS_IE11 ||
        detector.IS_IE || e.getEvent().target !== this.container
      ) {
        if (
          name === DomEvent.MOUSE_MOVE &&
          this.isMouseDown &&
          this.autoScroll &&
          !DomEvent.isMultiTouchEvent(e.getEvent)
        ) {

          this.scrollPointToVisible(e.getGraphX(), e.getGraphY(), this.autoExtend)

        } else if (
          name === DomEvent.MOUSE_UP &&
          this.ignoreScrollbars &&
          this.translateToScrollPosition &&
          (this.container.scrollLeft !== 0 || this.container.scrollTop !== 0)
        ) {
          const s = this.view.scale
          const tr = this.view.translate
          this.view.setTranslate(
            tr.x - this.container.scrollLeft / s,
            tr.y - this.container.scrollTop / s,
          )
          this.container.scrollLeft = 0
          this.container.scrollTop = 0
        }

        if (this.mouseListeners != null) {
          const args = [sender, e]

          // Does not change returnValue in Opera
          if (!e.getEvent().preventDefault) {
            e.getEvent().returnValue = true
          }

          for (let i = 0; i < this.mouseListeners.length; i += 1) {
            const l = this.mouseListeners[i]

            if (name === DomEvent.MOUSE_DOWN) {
              l.mouseDown.apply(l, args)
            } else if (name === DomEvent.MOUSE_MOVE) {
              l.mouseMove.apply(l, args)
            } else if (name === DomEvent.MOUSE_UP) {
              l.mouseUp.apply(l, args)
            }
          }
        }

        // Invokes the click handler
        if (name === DomEvent.MOUSE_UP) {
          this.click(e)
        }
      }

      // Detects tapAndHold events using a timer
      if (
        (DomEvent.isTouchEvent(e.getEvent()) || DomEvent.isPenEvent(e.getEvent())) &&
        name === DomEvent.MOUSE_DOWN &&
        this.tapAndHoldEnabled && !this.tapAndHoldInProgress
      ) {
        this.tapAndHoldInProgress = true
        this.initialTouchX = e.getGraphX()
        this.initialTouchY = e.getGraphY()

        const handler = function () {
          if (this.tapAndHoldValid) {
            this.tapAndHold(e)
          }

          this.tapAndHoldInProgress = false
          this.tapAndHoldValid = false
        }

        if (this.tapAndHoldThread) {
          window.clearTimeout(this.tapAndHoldThread)
        }

        this.tapAndHoldThread = window.setTimeout(handler, this.tapAndHoldDelay)
        this.tapAndHoldValid = true
      } else if (name === DomEvent.MOUSE_UP) {
        this.tapAndHoldInProgress = false
        this.tapAndHoldValid = false
      } else if (this.tapAndHoldValid) {
        this.tapAndHoldValid =
          Math.abs(this.initialTouchX - e.getGraphX()) < this.tolerance &&
          Math.abs(this.initialTouchY - e.getGraphY()) < this.tolerance
      }

      // Stops editing for all events other than from cellEditor
      if (
        name === DomEvent.MOUSE_DOWN &&
        this.isEditing() &&
        !this.cellEditor.isEventSource(e.getEvent())
      ) {
        this.stopEditing(!this.isInvokesStopCellEditing())
      }

      this.consumeMouseEvent(name, e, sender)
    }
  }

  /**
   * Consumes the given <mxMouseEvent> if it's a touchStart event.
   */
  consumeMouseEvent(name: string, e: CustomMouseEvent, sender: any) {
    // Workaround for duplicate click in Windows 8 with Chrome/FF/Opera with touch
    if (name === DomEvent.MOUSE_DOWN && DomEvent.isTouchEvent(e.getEvent())) {
      e.consume(false)
    }
  }

  /**
   * Dispatches a <DomEvent.GESTURE> event. The following example will resize the
   * cell under the mouse based on the scale property of the native touch event.
   *
   * (code)
   * graph.addListener(DomEvent.GESTURE, function(sender, eo)
   * {
   *   var evt = eo.getProperty('event');
   *   var state = graph.view.getState(eo.getProperty('cell'));
   *
   *   if (graph.isEnabled() && graph.isCellResizable(state.cell) && Math.abs(1 - evt.scale) > 0.2)
   *   {
   *     var scale = graph.view.scale;
   *     var tr = graph.view.translate;
   *
   *     var w = state.width * evt.scale;
   *     var h = state.height * evt.scale;
   *     var x = state.x - (w - state.width) / 2;
   *     var y = state.y - (h - state.height) / 2;
   *
   *     var bounds = new Rect(graph.snap(x / scale) - tr.x,
   *     		graph.snap(y / scale) - tr.y, graph.snap(w / scale), graph.snap(h / scale));
   *     graph.resizeCell(state.cell, bounds);
   *     eo.consume();
   *   }
   * });
   * (end)
   *
   * Parameters:
   *
   * evt - Gestureend event that represents the gesture.
   * cell - Optional <Cell> associated with the gesture.
   */
  fireGestureEvent(e: MouseEvent, cell?: Cell) {
    // Resets double tap event handling when gestures take place
    this.lastTouchTime = 0
    // this.fireEvent(new DomEventObject(DomEvent.GESTURE, 'event', e, 'cell', cell))
  }

  destroyed: boolean = false
  destroy() {
    if (!this.destroyed) {
      this.destroyed = true

      if (this.tooltipHandler != null) {
        this.tooltipHandler.destroy()
      }

      if (this.selectionCellsHandler != null) {
        this.selectionCellsHandler.destroy()
      }

      if (this.panningHandler != null) {
        this.panningHandler.destroy()
      }

      if (this.popupMenuHandler != null) {
        this.popupMenuHandler.destroy()
      }

      if (this.connectionHandler != null) {
        this.connectionHandler.destroy()
      }

      if (this.graphHandler != null) {
        this.graphHandler.destroy()
      }

      if (this.cellEditor != null) {
        this.cellEditor.destroy()
      }

      if (this.view != null) {
        this.view.destroy()
      }

      this.model.off(Model.eventNames.change, this.graphModelChanged);
      (this as any).container = null
    }
  }

  // #endregion
}

export namespace Graph {
  export interface Options {
    model?: Model,
    renderHint?: 'exact' | 'faster' | 'fastest',
    stylesheet?: Stylesheet,
  }

  export interface CreateNodeOptions {
    id?: string
    data?: any
    x?: number
    y?: number
    width?: number
    height?: number
    style?: string
    relative?: boolean
  }

  export interface InsertNodeOptions extends CreateNodeOptions {
    parent?: Cell
    index?: number
  }

  export interface CreateEdgeOptions {
    id?: string
    data?: any
    style?: string
  }

  export interface InsertEdgeOptions extends CreateEdgeOptions {
    parent?: Cell
    index?: number
    sourceNode?: Cell,
    targetNode?: Cell,
  }

  export const eventNames = {
    root: 'root',
    addOverlay: 'addOverlay',
    removeOverlay: 'removeOverlay',
    removeOverlays: 'removeOverlays',
    startEditing: 'startEditing',
    editingStarted: 'editingStarted',
    editingStopped: 'editingStopped',
    labelChanged: 'labelChanged',
    escape: 'escape',
    size: 'size',
    alignCells: 'alignCells',
    flipEdge: 'flipEdge',
    orderCells: 'orderCells',
    cellsOrdered: 'cellsOrdered',
    groupCells: 'groupCells',
    ungroupCells: 'ungroupCells',
    removeCellsFromParent: 'removeCellsFromParent',
    addCells: 'addCells',
    cellsAdded: 'cellsAdded',
    removeCells: 'removeCells',
    cellsRemoved: 'cellsRemoved',
    splitEdge: 'splitEdge',
    toggleCells: 'toggleCells',
    foldCells: 'foldCells',
    cellsFolded: 'cellsFolded',
    updateCellSize: 'updateCellSize',
    resizeCells: 'resizeCells',
    cellsResized: 'cellsResized',
  }
}
