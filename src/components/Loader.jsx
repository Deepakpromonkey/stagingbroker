import React, { Component } from 'react';

import CircularProgress from '@mui/material/CircularProgress';

class Loader extends Component { 
    constructor(props) {
        super();
    }

    render () {
        
        return (

            <>
                {this.props.loading === true
                    ?
                        <div className="loader flex-center">
                            <CircularProgress size={this.props.size || 30} color={this.props.color ? this.props.color : 'secondary'} />
                        </div>
                    :
                        null
                }
            </>
        )
    }
}

export default Loader;