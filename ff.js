//$(function(){

    /*******************************************************
    * ALL VARIABLES
    *******************************************************/
    var componentCount = 0;
    var connectorCount = 0;
    var componentsDB = {};
    var exportJSON = {};
    var draggedEl;
    var prevMousePos = {x: -1, y: -1};
    var prevSelected;

    //////////////// END OF ALL VARIABLES //////////////////

    /*******************************************************
    * All the things related to INIT
    *******************************************************/
    $('#main-svg').css({
        //height: ($(window).height()-100) + 'px'
    });
    //////////////////// END OF INIT ////////////////////////

    /*******************************************************
    * All the things related to ADDING COMPONENT
    *******************************************************/            
    $('#add-component').click(function(){
        var newC = $('#clone-rec').clone();
        var componentID = 'component-'+ (++componentCount);
        newC.attr('id', componentID);
		var newCSSTransformVal = "matrix(1, 0, 0, 1, " + (70 + Math.random()*30) + ", " + (70 + Math.random()*30) + ")";
		newC.css('transform', newCSSTransformVal);
        $('#main-svg').append(newC);

        //add the component to componentsDB for future ref
        componentsDB[componentID] = {
            inConnectors: [],
            outConnectors: []
        };
    });
    ////////////// END OF ADDING COMPONENT //////////////////


    /*******************************************************
    * All the things related to DRAGGING AND REPOSITION
    *******************************************************/           
    
    $(document).on('mousedown', '.cg', function (ev) {
        draggedEl = $(this);
        prevMousePos.x = ev.pageX;
        prevMousePos.y = ev.pageY;
    });

    $(document).on('mousemove', function (ev) {
        if (draggedEl) {
            var prevElX = parseInt(draggedEl.css('transform').split(',')[4]);
            var prevElY = parseInt(draggedEl.css('transform').split(',')[5]);
            var mouseDiffX = ev.pageX - prevMousePos.x;
            var mouseDiffY = ev.pageY - prevMousePos.y;

            var newElX = prevElX + mouseDiffX;
            var newElY = prevElY + mouseDiffY;

            var newCSSTransformVal = "matrix(1, 0, 0, 1, " + newElX + ", " + newElY + ")";

            $(draggedEl).css('transform', newCSSTransformVal);

            prevMousePos.x = ev.pageX;
            prevMousePos.y = ev.pageY;

            //ALSO NEED TO UPDATE THE CONNECTORS POSITION
            repositionAllConnectorConnectedTo(draggedEl.attr('id'), newElX, newElY);
        }
    });

    $(document).on('mouseup', function () {
        if (draggedEl && prevMousePos.x > 0 && prevMousePos.y > 0) {
            //redrawAllConnectors();
        }

        draggedEl = undefined;
        prevMousePos = {x: -1, y: -1};
    });
    //////////// END OFDRAGGING AND REPOSITION //////////////


    /*******************************************************
    * SELECTING AND JOINING
    *******************************************************/            
    //user click on a content should make it selected
    $(document).on('click', '.el', function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        prevSelected = $('.selected-el');
        prevSelected.removeClass('selected-el');
        $(this).addClass('selected-el');

        // if an "in" node is clicked 
        // and prev selected is "out" node
        // then join them
        if($(this).hasClass('knot in') && prevSelected.hasClass('knot out')) {
            drawConnectors(prevSelected.closest('.cg'), $(this).closest('.cg'));
        }
    });

    //clicking on body should deselect
    $(document).on('click', function (ev) {
        $('.selected-el').removeClass('selected-el');
    });

    // create a path between 2 knots
    // overwrite if the path already exists
    // each connector will have an attribute 
    // data-ftid = "fromID---toID"            
    function drawConnectors (fromCom, toCom) {
        if(!fromCom && !toCom) { return; }
        if(!(fromCom instanceof jQuery)) { fromCom = $('#' + fromCom); }
        if(!(toCom instanceof jQuery)) { toCom = $('#' + toCom); }

        var fromX = parseInt(fromCom.css('transform').split(',')[4]) + 103;
        var fromY = parseInt(fromCom.css('transform').split(',')[5]) + 73;

        var toX = parseInt(toCom.css('transform').split(',')[4]) + 103;
        var toY = parseInt(toCom.css('transform').split(',')[5]) - 3;

        var fromID = fromCom.attr('id');
        var toID = toCom.attr('id');

        var ftid = fromID + '---' + toID;

        //remove if existing
        $('[data-ftid="' + ftid + '"]').remove();

        var newConnector = $('#clone-connector').clone();
        var connectorID = "connector-" + (++connectorCount);
        newConnector.attr({
            id: connectorID,
            x1: fromX,
            y1: fromY,
            x2: toX,
            y2: toY,
            "data-ftid": ftid
        });

        //update componentsDB
        componentsDB[fromID].outConnectors.push(connectorID);
        componentsDB[toID].inConnectors.push(connectorID);

        $('#main-svg').prepend(newConnector);
    }

    function redrawAllConnectors () {
        //loop thru all the connectors and redraw
        var ftids;
        $('.connector').not('#clone-connector').each(function(){
            ftids = $(this).attr('data-ftid').split('---');
            drawConnectors($('#' + ftids[0]), $('#' + ftids[1]));
        });
    }

    //reposition all the connectors connected to a given ID
    function repositionAllConnectorConnectedTo (comID, comX, comY) {
        componentsDB[comID].inConnectors.forEach(function(inConID){
            $('#' + inConID).attr({
                x2: comX + 103,
                y2: comY - 3
            });
        });

        componentsDB[comID].outConnectors.forEach(function(outConID){
            $('#' + outConID).attr({
                x1: comX + 103,
                y1: comY + 73
            });
        })
    }

    /////////////////////////////////////////////////////////

    /*******************************************************
    * DELETING ELEMENTS
    *******************************************************/
    $(document).on('keydown', function (e) {
        //console.log(e.keyCode);

        //if keyboard delete key is pressed
        if (e.keyCode === 46) {
            var selectedEl = $('.selected-el');
            if(selectedEl) {

                // if it is a connector, straight away delete it
                if (selectedEl.hasClass('connector')) {
                    deleteConnectorFromDB(selectedEl.attr('id'));
                    selectedEl.remove();
                }

                // else if it a component, delete the GROUP
                else {
                    var comID = selectedEl.closest('.cg').attr('id');
                    deleteAllConnectorsConnectedWith(comID);
                    deleteComponentFromDB(comID);
                    selectedEl.closest('.cg').remove();
                }
            }
        }
    });

    // Loop thru each connector
    // And find and delete all those connectors
    // that are connected with the supplied componentID
    function deleteAllConnectorsConnectedWith (comID) {
        $('.connector').not('#clone-connector').each(function(){
            if($(this).attr('data-ftid').split('---').indexOf(comID) >= 0) {
                deleteConnectorFromDB($(this).attr('id'));
                $(this).remove();
            }
        });
    }

    function deleteComponentFromDB (comID) {
        delete componentsDB[comID];
    }

    function deleteConnectorFromDB (connectorID) {
        //each connector has a data-ftid which stores
        // from comID---toID
        var ftids = $('#' + connectorID).attr('data-ftid').split('---');

        componentsDB[ftids[0]] && componentsDB[ftids[0]].outConnectors.splice(componentsDB[ftids[0]].outConnectors.indexOf(connectorID), 1);
        componentsDB[ftids[1]] && componentsDB[ftids[1]].inConnectors.splice(componentsDB[ftids[1]].inConnectors.indexOf(connectorID), 1);
    } 
    ////////////////////////////////////////////////////////

    /*******************************************************
    * EXPORTING / CREATING JSON
    *******************************************************/
    $('#btn-export').on('click', function(){
        //we already have componentsDB containing all the components
		for (var cid in componentsDB) {
			componentsDB[cid].transformMatrix = $('#' + cid).css('transform');
		}
        $('#start-import').hide();
		$('.full-mask .popup .ip-op').val(JSON.stringify(componentsDB));
		showPopup({headerMsg: "Exported as JSON"});
		//console.log(componentsDB);
    });
    ////////////////////////////////////////////////////////


    /*******************************************************
    * IMPORTING / CREATING JSON
    *******************************************************/
    $('#btn-import').on('click', function() {        
        $('.full-mask .popup .ip-op').val("");
        $('#start-import').show();
        showPopup({headerMsg: "Import JSON"});
        //console.log(componentsDB);
    });

    $('#start-import').on('click', function(){
        var importedComponentDB = JSON.parse($('.full-mask .popup .ip-op').val());
        startImporting (importedComponentDB)
        hidePopup();
    });

    function startImporting (importedComponentDB) {
        var importedWiresDB = {};

        // Draw The Components
        for(var id in importedComponentDB) {
            var newC = $('#clone-rec').clone();
            var componentID = 'component-'+ (++componentCount);
            newC.attr('id', componentID);
            var cssTransformVal = importedComponentDB[id].transformMatrix;
            newC.css('transform', cssTransformVal);
            $('#main-svg').append(newC);

            //add the component to componentsDB for future ref
            componentsDB[componentID] = importedComponentDB[id];

            // identify the wires
            // populate importedWiresDB
            for(var j in importedComponentDB[id].inConnectors) {
                importedWiresDB[importedComponentDB[id].inConnectors[j]] = importedWiresDB[importedComponentDB[id].inConnectors[j]] || {};
                importedWiresDB[importedComponentDB[id].inConnectors[j]].in = componentID;
            }

            for(var k in importedComponentDB[id].outConnectors) {
                importedWiresDB[importedComponentDB[id].outConnectors[k]] = importedWiresDB[importedComponentDB[id].outConnectors[k]] || {};
                importedWiresDB[importedComponentDB[id].outConnectors[k]].out = componentID;
            }
        }

        // Draw The Wires
        for(var i in importedWiresDB) {
            drawConnectors(importedWiresDB[i].in, importedWiresDB[i].out);
        }

    }
    ////////////////////////////////////////////////////////
	
	
	/*********************************************************
	* POPUP AND MODAL
	*********************************************************/
	$('body').on('click', '.popup .close-icon', function(e){
		e.preventDefault();
		e.stopPropagation();
		$(this).closest('.full-mask').hide();
	})
	
	/*
	* popupCfg = {
			headerMsg: ""
		}
	*/
	function showPopup (popupCfg) {
		$('.full-mask .popup .header').text(popupCfg.headerMsg);
		$('.full-mask').show();
	}

    function hidePopup () {
        $('.full-mask').hide();
    }
	//////////////////////////////////////////////////////////

//});
